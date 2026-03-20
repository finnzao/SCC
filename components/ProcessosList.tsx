// components/ProcessosList.tsx - F4: Lista de processos de um custodiado
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Calendar, UserCheck, Loader2, AlertTriangle } from 'lucide-react';
import { useProcessos } from '@/hooks/useProcessos';
import { SituacaoBadge, StatusBadge } from '@/components/SituacaoBadge';
import ProcessoActions from '@/components/ProcessoActions';
import ProcessoForm from '@/components/ProcessoForm';
import { formatToBrazilianDate } from '@/lib/utils/dateutils';
import type { Processo } from '@/types/processo';

interface ProcessosListProps {
  custodiadoId: number;
  custodiadoNome: string;
}

export default function ProcessosList({ custodiadoId, custodiadoNome }: ProcessosListProps) {
  const router = useRouter();
  const { buscarPorCustodiado, loading } = useProcessos();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarProcessos = useCallback(async () => {
    setError(null);
    try {
      const list = await buscarPorCustodiado(custodiadoId);
      setProcessos(list);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar processos');
    }
  }, [custodiadoId, buscarPorCustodiado]);

  useEffect(() => {
    if (custodiadoId > 0) {
      carregarProcessos();
    }
  }, [custodiadoId, carregarProcessos]);

  const handleRegistrarComparecimento = (processo: Processo) => {
    router.push(`/dashboard/comparecimento/confirmar?processoId=${processo.id}&processo=${encodeURIComponent(processo.numeroProcesso)}`);
  };

  if (loading && processos.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-gray-800">Processos</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="ml-2 text-gray-600">Carregando processos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-gray-800">
            Processos ({processos.length})
          </h3>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Adicionar Processo
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {processos.length === 0 && !error ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Nenhum processo vinculado a este custodiado.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-primary hover:underline text-sm"
          >
            Adicionar primeiro processo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {processos.map(processo => (
            <div
              key={processo.id}
              className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                processo.inadimplente ? 'border-red-200 bg-red-50' : 'border-gray-200'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Info do processo */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-sm font-medium text-gray-800">
                      {processo.numeroProcesso}
                    </span>
                    <SituacaoBadge situacao={processo.situacaoProcesso} />
                    <StatusBadge status={processo.status} />
                  </div>
                  <div className="text-sm text-gray-600 space-y-0.5">
                    <p>{processo.vara} - {processo.comarca}</p>
                    <p className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Próximo: {processo.proximoComparecimento ? formatToBrazilianDate(processo.proximoComparecimento) : 'N/A'}
                      {processo.diasAtraso > 0 && (
                        <span className="text-red-600 font-medium ml-2">
                          ({processo.diasAtraso} dias de atraso)
                        </span>
                      )}
                    </p>
                    <p>Periodicidade: {processo.periodicidadeDescricao}</p>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 flex-wrap">
                  {processo.situacaoProcesso === 'ATIVO' && (
                    <button
                      onClick={() => handleRegistrarComparecimento(processo)}
                      className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                    >
                      <UserCheck className="w-4 h-4" />
                      Comparecimento
                    </button>
                  )}
                  <ProcessoActions processo={processo} onActionComplete={carregarProcessos} compact />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Novo Processo */}
      {showForm && (
        <ProcessoForm
          custodiadoId={custodiadoId}
          custodiadoNome={custodiadoNome}
          onClose={() => setShowForm(false)}
          onSuccess={carregarProcessos}
        />
      )}
    </div>
  );
}
