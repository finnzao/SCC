'use client';

// Lista de execucoes; a fila D-60 e filtro local da mesma lista.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gavel, Loader2, AlertTriangle } from 'lucide-react';
import { execucaoService } from '@/services/execucaoService';
import { BarraProgressoPena, SituacaoExecucaoBadge } from '@/components/BarraProgressoPena';
import type { ExecucaoPenal } from '@/types/execucao';

export default function ExecucoesPage() {
  const [execucoes, setExecucoes] = useState<ExecucaoPenal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    execucaoService.listar()
      .then(resp => {
        if (resp.success) setExecucoes((resp.data as { data?: ExecucaoPenal[] })?.data ?? []);
        else setErro(resp.error || 'Erro ao carregar execuções');
      })
      .finally(() => setCarregando(false));
  }, []);

  const proximasExtincao = execucoes.filter(
    e => e.situacaoExecucao === 'EM_CUMPRIMENTO' && e.diasRestantes <= 60,
  );

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Gavel className="w-7 h-7 text-purple-700" />
        <div>
          <h1 className="text-2xl font-bold">Execuções — regime aberto</h1>
          <p className="text-sm text-gray-500">
            Penas em cumprimento, progresso e proximidade da extinção
          </p>
        </div>
      </div>

      {erro && <p className="text-red-600 bg-red-50 rounded-lg p-3">{erro}</p>}

      {proximasExtincao.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="font-semibold text-red-800 flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4" />
            {proximasExtincao.length} pena(s) terminam em até 60 dias
          </p>
          <p className="text-sm text-red-700">
            Prazo para instruir o pedido de extinção da punibilidade (LEP art. 66, II).
            O sistema sinaliza — a extinção depende de decisão judicial.
          </p>
        </div>
      )}

      {execucoes.length === 0 && !erro && (
        <p className="text-gray-500 bg-gray-50 rounded-xl p-6 text-center">
          Nenhuma execução registrada. Use “Registrar pena” nas ações de um processo
          de regime aberto.
        </p>
      )}

      <div className="space-y-3">
        {execucoes.map(e => (
          <Link
            key={e.id}
            href={'/dashboard/execucoes/' + e.id}
            className="block bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start gap-3 mb-2">
              <div>
                <p className="font-semibold">{e.custodiadoNome || 'Pessoa Monitorada'}</p>
                <p className="text-xs text-gray-500 font-mono">PEC {e.numeroExecucao}</p>
              </div>
              <SituacaoExecucaoBadge execucao={e} />
            </div>
            <BarraProgressoPena execucao={e} compact />
          </Link>
        ))}
      </div>
    </div>
  );
}
