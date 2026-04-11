'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { testService, initializeBackendApi, configureAuthHeaders } from '@/lib/api/services';
import { HealthResponse, AppInfoResponse } from '@/types/api';
import { logger } from '@/lib/utils/logger';

interface ApiContextType {
  isConnected: boolean;
  health: HealthResponse | null;
  appInfo: AppInfoResponse | null;
  lastCheck: Date | null;
  isChecking: boolean;
  checkConnection: () => Promise<boolean>;
  setAuthToken: (token: string) => void;
  clearAuth: () => void;
  forceCheck: () => Promise<boolean>;
}

interface ApiProviderProps {
  children: ReactNode;
  autoCheck?: boolean;
  checkInterval?: number;
  enableCache?: boolean;
  cacheTimeout?: number;
}

interface CacheEntry {
  isConnected: boolean;
  health: HealthResponse | null;
  appInfo: AppInfoResponse | null;
  timestamp: number;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export function ApiProvider({
  children,
  autoCheck = false,
  checkInterval = 300000,
  enableCache = true,
  cacheTimeout = 60000,
}: ApiProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfoResponse | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef<CacheEntry | null>(null);
  const isInitializedRef = useRef(false);

  const isCacheValid = useCallback((): boolean => {
    if (!enableCache || !cacheRef.current) return false;
    return Date.now() - cacheRef.current.timestamp < cacheTimeout;
  }, [enableCache, cacheTimeout]);

  const saveToCache = useCallback((connected: boolean, healthData: HealthResponse | null, infoData: AppInfoResponse | null) => {
    if (enableCache) cacheRef.current = { isConnected: connected, health: healthData, appInfo: infoData, timestamp: Date.now() };
  }, [enableCache]);

  const loadFromCache = useCallback((): boolean => {
    if (!isCacheValid() || !cacheRef.current) return false;
    logger.log('[ApiProvider] Usando dados do cache');
    setIsConnected(cacheRef.current.isConnected);
    setHealth(cacheRef.current.health);
    setAppInfo(cacheRef.current.appInfo);
    return true;
  }, [isCacheValid]);

  const clearCache = useCallback(() => { cacheRef.current = null; }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (isChecking) return isConnected;
    if (loadFromCache()) return isConnected;

    setIsChecking(true);
    try {
      logger.log('[ApiProvider] Verificando conexão com o backend...');
      const results = await Promise.allSettled([
        Promise.race([testService.health(), new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))]),
        Promise.race([testService.info(), new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))]),
      ]);

      const healthData: HealthResponse = results[0].status === 'fulfilled'
        ? results[0].value as HealthResponse
        : { status: 'DOWN', timestamp: new Date().toISOString() };

      const infoData: AppInfoResponse = results[1].status === 'fulfilled'
        ? results[1].value as AppInfoResponse
        : { name: 'SCC', version: '1.0.0', description: 'SCC', environment: process.env.NODE_ENV || 'development', buildTime: new Date().toISOString(), javaVersion: 'N/A', springBootVersion: 'N/A' };

      const connected = healthData.status === 'UP';
      setIsConnected(connected);
      setHealth(healthData);
      setAppInfo(infoData);
      setLastCheck(new Date());
      saveToCache(connected, healthData, infoData);
      return connected;
    } catch (error) {
      logger.error('[ApiProvider] Erro ao verificar conexão:', error);
      setIsConnected(false);
      setLastCheck(new Date());
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, isConnected, loadFromCache, saveToCache]);

  const forceCheck = useCallback(async (): Promise<boolean> => {
    clearCache();
    return checkConnection();
  }, [checkConnection, clearCache]);

  const setAuthToken = useCallback((token: string) => {
    logger.log('[ApiProvider] Configurando token de autenticação');
    configureAuthHeaders(token);
    if (typeof window !== 'undefined') localStorage.setItem('api_auth_token', token);
  }, []);

  const clearAuthFn = useCallback(() => {
    logger.log('[ApiProvider] Removendo autenticação');
    if (typeof window !== 'undefined') localStorage.removeItem('api_auth_token');
    clearCache();
  }, [clearCache]);

  useEffect(() => {
    if (isInitializedRef.current) return;
    initializeBackendApi();
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('api_auth_token');
      if (savedToken) configureAuthHeaders(savedToken);
    }
    isInitializedRef.current = true;
    if (autoCheck) {
      checkTimeoutRef.current = setTimeout(() => { checkConnection(); }, 1000);
    }
    return () => { if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autoCheck || !checkInterval || checkInterval <= 0) return;
    intervalRef.current = setInterval(() => { checkConnection(); }, checkInterval);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoCheck, checkInterval, checkConnection]);

  useEffect(() => { return () => { clearCache(); }; }, [clearCache]);

  return (
    <ApiContext.Provider value={{ isConnected, health, appInfo, lastCheck, isChecking, checkConnection, setAuthToken, clearAuth: clearAuthFn, forceCheck }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi(): ApiContextType {
  const context = useContext(ApiContext);
  if (context === undefined) throw new Error('useApi deve ser usado dentro de um ApiProvider');
  return context;
}

export function useApiConnection(): boolean {
  const { isConnected } = useApi();
  return isConnected;
}

export function useAppInfo(): AppInfoResponse | null {
  const { appInfo } = useApi();
  return appInfo;
}

export function useApiHealth(): HealthResponse | null {
  const { health } = useApi();
  return health;
}

export type { ApiContextType, ApiProviderProps };
