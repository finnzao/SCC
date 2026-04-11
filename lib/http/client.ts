/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { logger } from '@/lib/utils/logger';

export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  requireAuth?: boolean;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
  status: number;
  timestamp?: string;
}

interface ClientConfig {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  onUnauthorized?: () => void;
}

class HttpClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private retries: number;
  private isRefreshing = false;
  private onUnauthorized?: () => void;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  private publicRoutes = [
    '/auth/login',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/setup',
    '/usuarios/convites/validar',
    '/usuarios/convites/ativar',
    '/health',
    '/actuator',
  ];

  constructor(config?: ClientConfig) {
    this.baseURL = config?.baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...config?.headers,
    };
    this.timeout = config?.timeout || 60000;
    this.retries = config?.retries || 3;
    this.onUnauthorized = config?.onUnauthorized;

    logger.log('[HttpClient] Inicializado com baseURL:', this.baseURL);
  }

  setUnauthorizedHandler(handler: () => void) {
    this.onUnauthorized = handler;
  }

  private isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('access-token');
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access-token');
  }

  private isPublicRoute(endpoint: string): boolean {
    return this.publicRoutes.some(route => endpoint.includes(route));
  }

  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    logger.log('[HttpClient] Token de autorização configurado');
  }

  clearAuthToken() {
    delete this.defaultHeaders['Authorization'];
    logger.log('[HttpClient] Token de autorização removido');
  }

  private processQueue(error: any, token: string | null = null): void {
    this.failedQueue.forEach(prom => {
      if (error) prom.reject(error);
      else prom.resolve(token);
    });
    this.failedQueue = [];
  }

  private clearAuthData(): void {
    logger.log('[HttpClient] Limpando dados de autenticação');
    this.clearAuthToken();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access-token');
      localStorage.removeItem('refresh-token');
      localStorage.removeItem('user-data');
      document.cookie = 'auth-token=; path=/; max-age=0';
    }
  }

  private async handleUnauthorized(originalConfig: RequestConfig, endpoint: string): Promise<any> {
    if (endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh')) {
      logger.log('[HttpClient] Não renovando token para endpoint de autenticação');
      this.clearAuthData();
      this.onUnauthorized?.();
      return Promise.reject(new Error('Não autenticado'));
    }

    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      }).then(token => {
        originalConfig.headers = { ...originalConfig.headers, Authorization: `Bearer ${token}` };
        return this.makeRequest(endpoint, originalConfig);
      }).catch(err => Promise.reject(err));
    }

    this.isRefreshing = true;
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh-token') : null;

    if (!refreshToken) {
      logger.log('[HttpClient] Sem refresh token disponível');
      this.isRefreshing = false;
      this.clearAuthData();
      this.onUnauthorized?.();
      return Promise.reject(new Error('Não autenticado'));
    }

    try {
      logger.log('[HttpClient] Tentando renovar token...');
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const { accessToken, refreshToken: newRefreshToken, expiresIn } = data.data;
          logger.log('[HttpClient] Token renovado com sucesso');

          if (typeof window !== 'undefined') {
            localStorage.setItem('access-token', accessToken);
            localStorage.setItem('refresh-token', newRefreshToken);
            document.cookie = `auth-token=${accessToken}; path=/; max-age=${expiresIn || 3600}; samesite=lax`;
          }

          this.setAuthToken(accessToken);
          originalConfig.headers = { ...originalConfig.headers, Authorization: `Bearer ${accessToken}` };
          this.processQueue(null, accessToken);
          this.isRefreshing = false;
          return this.makeRequest(endpoint, originalConfig);
        }
      }
      throw new Error('Falha ao renovar token');
    } catch (refreshError) {
      logger.error('[HttpClient] Erro ao renovar token:', refreshError);
      this.processQueue(refreshError, null);
      this.isRefreshing = false;
      this.clearAuthData();
      this.onUnauthorized?.();
      return Promise.reject(refreshError);
    }
  }

  setHeaders(headers: Record<string, string>) {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  removeHeader(headerName: string) {
    delete this.defaultHeaders[headerName];
  }

  setBaseURL(baseURL: string) {
    this.baseURL = baseURL;
  }

  setTimeout(timeout: number) {
    this.timeout = timeout;
  }

  setRetries(retries: number) {
    this.retries = retries;
  }

  clearAuth() {
    this.clearAuthToken();
    this.clearAuthData();
  }

  private async makeRequest<T>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.timeout,
      retries = this.retries,
      requireAuth = true,
    } = config;

    const isPublic = this.isPublicRoute(endpoint);

    if (!isPublic && requireAuth && !this.isAuthenticated()) {
      logger.error('[HttpClient] Requisição bloqueada: usuário não autenticado');
      this.onUnauthorized?.();
      return { success: false, status: 401, error: 'Usuário não autenticado', timestamp: new Date().toISOString() };
    }

    if (!isPublic && requireAuth) {
      const token = this.getToken();
      if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    const requestHeaders = { ...this.defaultHeaders, ...headers };

    logger.log(`[HttpClient] ${method} ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const requestConfig: RequestInit = {
      method,
      headers: requestHeaders,
      signal: controller.signal,
    };

    if (body && method !== 'GET') {
      if (body instanceof FormData) {
        const { 'Content-Type': _, ...headersWithoutContentType } = requestHeaders;
        requestConfig.headers = headersWithoutContentType;
        requestConfig.body = body;
      } else {
        requestConfig.body = typeof body === 'string' ? body : JSON.stringify(body);
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, requestConfig);
        clearTimeout(timeoutId);

        if (response.status === 401 && requireAuth && !isPublic) {
          logger.warn('[HttpClient] Token expirado ou inválido (401)');
          return this.handleUnauthorized(config, endpoint);
        }

        let responseData: any;
        const contentType = response.headers.get('content-type');

        try {
          if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
          } else {
            const textData = await response.text();
            try { responseData = JSON.parse(textData); } catch { responseData = textData; }
          }
        } catch {
          responseData = null;
        }

        logger.log(`[HttpClient] Response ${response.status} for ${method} ${url}`);

        const apiResponse: ApiResponse<T> = {
          data: responseData,
          success: response.ok,
          status: response.status,
          error: !response.ok ? this.extractErrorMessage(responseData) : undefined,
          message: this.extractMessage(responseData),
          timestamp: new Date().toISOString(),
        };

        if (!response.ok && response.status >= 500 && attempt < retries) {
          lastError = new Error(`HTTP ${response.status}: ${apiResponse.error}`);
          await this.delay(1000 * Math.pow(2, attempt));
          continue;
        }

        return apiResponse;
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error as Error;
        if (attempt < retries) {
          logger.log(`[HttpClient] Tentativa ${attempt + 1} falhou, tentando novamente...`);
          await this.delay(1000 * Math.pow(2, attempt));
          continue;
        }
      }
    }

    const errorMessage = this.getErrorMessage(lastError);
    logger.error(`[HttpClient] Todas as tentativas falharam para ${method} ${url}:`, lastError);

    return { success: false, status: 0, error: errorMessage, timestamp: new Date().toISOString() };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private extractErrorMessage(data: any): string {
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object') return data.message || data.error || data.detail || data.errorMessage || 'Erro na requisição';
    return 'Erro desconhecido';
  }

  private extractMessage(data: any): string | undefined {
    if (data && typeof data === 'object') return data.message || data.msg;
    return undefined;
  }

  private getErrorMessage(error: Error | null): string {
    if (!error) return 'Erro desconhecido';
    if (error.name === 'AbortError') return 'Tempo de requisição excedido. Por favor, tente novamente.';
    if (error.message.includes('fetch')) return 'Erro de conexão com o servidor';
    return error.message;
  }

  async get<T>(endpoint: string, params?: Record<string, any>, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) searchParams.append(key, String(value));
      });
      url += `?${searchParams.toString()}`;
    }
    return this.makeRequest<T>(url, { ...config, method: 'GET', requireAuth: config?.requireAuth ?? true });
  }

  async post<T>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'POST', body, requireAuth: config?.requireAuth ?? true });
  }

  async put<T>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'PUT', body, requireAuth: config?.requireAuth ?? true });
  }

  async patch<T>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'PATCH', body, requireAuth: config?.requireAuth ?? true });
  }

  async delete<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'DELETE', requireAuth: config?.requireAuth ?? true });
  }

  async upload<T>(endpoint: string, file: File | FormData, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    const formData = file instanceof FormData ? file : (() => { const fd = new FormData(); fd.append('file', file); return fd; })();
    return this.makeRequest<T>(endpoint, { ...config, method: 'POST', body: formData, requireAuth: config?.requireAuth ?? true });
  }

  async download(endpoint: string, filename?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, { headers: this.defaultHeaders });
      if (!response.ok) return { success: false, error: `HTTP ${response.status}` };

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const contentDisposition = response.headers.get('content-disposition');
      let downloadFilename = filename;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) downloadFilename = filenameMatch[1];
      }

      a.download = downloadFilename || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return { success: true };
    } catch (error) {
      logger.error('Erro no download:', error);
      return { success: false, error: 'Erro no download' };
    }
  }

  getConfig() {
    return { baseURL: this.baseURL, timeout: this.timeout, retries: this.retries, headers: { ...this.defaultHeaders } };
  }

  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    try {
      const response = await this.get('/health', undefined, { timeout: 5000, retries: 0, requireAuth: false });
      return { healthy: response.success, latency: Date.now() - startTime, error: response.error };
    } catch (error) {
      return { healthy: false, latency: Date.now() - startTime, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }
}

export const apiClient = new HttpClient();
export const createHttpClient = (config?: ClientConfig) => new HttpClient(config);
export const httpClient = apiClient;
export { HttpClient };
export type { ClientConfig };
