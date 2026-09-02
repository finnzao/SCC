// components/DebugApiStatus.tsx
'use client';

import { useState } from 'react';
import { useApi } from '@/contexts/ApiContext';
import { custodiadosService } from '@/lib/api/services';
import { PessoaMonitoradaDTO, EstadoBrasil } from '@/types/api';
import { Activity, Send, Database, AlertCircle, CheckCircle } from 'lucide-react';

export default function DebugApiStatus() {
  const { isConnected, health, appInfo, checkConnection } = useApi();
  const [testLoading, setTestLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [testResult, setTestResult] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);

  const testCreatePerson = async () => {
    setTestLoading(true);
    
    const testData: PessoaMonitoradaDTO = {
      nome: 'Teste Debug API',
      contato: '(71)99999-9999', // Formato válido
      processo: '1234567-89.2025.8.05.0001', // Formato válido
      vara: 'Teste Vara',
      comarca: 'Salvador',
      dataDecisao: '2025-01-01',
      dataComparecimentoInicial: '2025-01-15',
      periodicidade: 30,
      cep: '40070-110', // Formato válido com hífen
      logradouro: 'Rua Teste Debug', // Mínimo 5 caracteres
      numero: '123',
      bairro: 'Centro',
      cidade: 'Salvador',
      estado: EstadoBrasil.BA, 
      cpf: '256.766.020-82', // Formato válido
      observacoes: 'Teste de debug da API'
    };

    try {
      console.log('[DEBUG] Testando criação de pessoa:', testData);
      
      const result = await custodiadosService.criar(testData);
      
      console.log('[DEBUG] Resultado do teste:', result);
      setTestResult(result);
    } catch (error) {
      console.error('[DEBUG] Erro no teste:', error);
      setTestResult({ success: false, error: error?.toString() });
    } finally {
      setTestLoading(false);
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-white border rounded-lg shadow-lg max-w-md">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-sm">Debug API</h3>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          <span className="text-xs">
            {expanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t">
          {/* Status Detalhado */}
          <div className="space-y-2 mb-4 mt-3">
            <div className="text-xs space-y-1">
              <div><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}</div>
              <div><strong>Conectado:</strong> {isConnected ? '✅ Sim' : '❌ Não'}</div>
              <div><strong>Health Status:</strong> {health?.status || 'Unknown'}</div>
              <div><strong>App Name:</strong> {appInfo?.name || 'Unknown'}</div>
              <div><strong>App Version:</strong> {appInfo?.version || 'Unknown'}</div>
              <div><strong>Environment:</strong> {appInfo?.environment || 'Unknown'}</div>
            </div>
          </div>

          {/* Detalhes da Resposta de Health */}
          {health && (
            <div className="mb-4">
              <div className="text-xs font-medium mb-1">Health Response:</div>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-20">
                {JSON.stringify(health, null, 2)}
              </pre>
            </div>
          )}

          {/* Detalhes da Resposta de Info */}
          {appInfo && (
            <div className="mb-4">
              <div className="text-xs font-medium mb-1">App Info Response:</div>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-20">
                {JSON.stringify(appInfo, null, 2)}
              </pre>
            </div>
          )}

          {/* Botões de Teste */}
          <div className="space-y-2">
            <button
              onClick={checkConnection}
              className="w-full bg-blue-500 text-white text-xs py-1.5 px-2 rounded hover:bg-blue-600"
            >
              🔄 Verificar Conexão
            </button>

            <button
              onClick={testCreatePerson}
              disabled={testLoading}
              className="w-full bg-green-500 text-white text-xs py-1.5 px-2 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              {testLoading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                  Testando...
                </>
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  🧪 Testar POST /pessoas
                </>
              )}
            </button>
          </div>

          {/* Resultado do Teste */}
          {testResult && (
            <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
              <div className="flex items-center gap-1 mb-1">
                <Database className="w-3 h-3" />
                <span className="font-medium">Resultado do Teste:</span>
              </div>
              <pre className="whitespace-pre-wrap overflow-auto max-h-32">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}