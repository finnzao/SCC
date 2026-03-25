// components/ProcessoActions.tsx - F10: Ações de gestão de processo
'use client';

import { useState } from 'react';
import { XCircle, PauseCircle, PlayCircle } from 'lucide-react';
import { useProcessos } from '@/hooks/useProcessos';
import { useToast } from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { Processo } from '@/types/processo';

interface ProcessoActionsProps {
  processo: Processo;
  onActionComplete?: () => void;
  compact?: boolean;
}

export default function ProcessoActions({ processo, onActionComplete, compact = false }: ProcessoActionsProps) {
  const { encerrar, suspender, reativar, loading } = useProcessos();
  const { showToast } = useToast();

  const [confirmAction, setConfirmAction] = useState<'encerrar' | 'suspender' | 'reativar' | null>(null);

  const handleEncerrar = async () => {
    const result = await encerrar(processo.id);
    if (result.success) {
      showToast({ type: 'success', title: 'Processo Encerrado', message: `Processo ${processo.numeroProcesso} foi encerrado.`, duration: 3000 });
      onActionComplete?.();
    } else {
      showToast({ type: 'error', title: 'Erro', message: result.message, duration: 5000 });
    }
    setConfirmAction(null);
  };

  const handleSuspender = async () => {
    const result = await suspender(processo.id);
    if (result.success) {
      showToast({ type: 'success', title: 'Processo Suspenso', message: `Processo ${processo.numeroProcesso} foi suspenso.`, duration: 3000 });
      onActionComplete?.();
    } else {
      showToast({ type: 'error', title: 'Erro', message: result.message, duration: 5000 });
    }
    setConfirmAction(null);
  };

  const handleReativar = async () => {
    const result = await reativar(processo.id);
    if (result.success) {
      showToast({ type: 'success', title: 'Processo Reativado', message: `Processo ${processo.numeroProcesso} foi reativado.`, duration: 3000 });
      onActionComplete?.();
    } else {
      showToast({ type: 'error', title: 'Erro', message: result.message, duration: 5000 });
    }
    setConfirmAction(null);
  };

  const isAtivo = processo.situacaoProcesso === 'ATIVO';
  const isEncerrado = processo.situacaoProcesso === 'ENCERRADO';
  const isSuspenso = processo.situacaoProcesso === 'SUSPENSO';

  const buttonBase = compact
    ? 'px-2 py-1 text-xs rounded flex items-center gap-1'
    : 'px-3 py-2 text-sm rounded-lg flex items-center gap-2 font-medium';

  return (
    <>
      <div className={compact ? 'flex gap-1' : 'flex gap-2 flex-wrap'}>
        {/* Encerrar - só quando ATIVO */}
        {isAtivo && (
          <button
            onClick={() => setConfirmAction('encerrar')}
            disabled={loading}
            className={`${buttonBase} bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50`}
            title="Encerrar Processo"
          >
            <XCircle className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
            {!compact && 'Encerrar'}
          </button>
        )}

        {/* Suspender - só quando ATIVO */}
        {isAtivo && (
          <button
            onClick={() => setConfirmAction('suspender')}
            disabled={loading}
            className={`${buttonBase} bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors disabled:opacity-50`}
            title="Suspender Processo"
          >
            <PauseCircle className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
            {!compact && 'Suspender'}
          </button>
        )}

        {/* Reativar - quando ENCERRADO ou SUSPENSO */}
        {(isEncerrado || isSuspenso) && (
          <button
            onClick={() => setConfirmAction('reativar')}
            disabled={loading}
            className={`${buttonBase} bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50`}
            title="Reativar Processo"
          >
            <PlayCircle className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
            {!compact && 'Reativar'}
          </button>
        )}
      </div>

      {/* Confirm Dialog - Encerrar */}
      <ConfirmDialog
        isOpen={confirmAction === 'encerrar'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleEncerrar}
        type="danger"
        title="Encerrar Processo"
        message={`Deseja encerrar o processo ${processo.numeroProcesso}? O processo não aparecerá mais na listagem ativa.`}
        details={[
          `Custodiado: ${processo.custodiadoNome}`,
          `Vara: ${processo.vara}`,
          `Comarca: ${processo.comarca}`,
        ]}
        confirmText="Sim, Encerrar"
        cancelText="Cancelar"
      />

      {/* Confirm Dialog - Suspender */}
      <ConfirmDialog
        isOpen={confirmAction === 'suspender'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleSuspender}
        type="warning"
        title="Suspender Processo"
        message={`Deseja suspender temporariamente o processo ${processo.numeroProcesso}?`}
        details={[
          `Custodiado: ${processo.custodiadoNome}`,
          'O processo poderá ser reativado posteriormente.',
        ]}
        confirmText="Sim, Suspender"
        cancelText="Cancelar"
      />

      {/* Confirm Dialog - Reativar */}
      <ConfirmDialog
        isOpen={confirmAction === 'reativar'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleReativar}
        type="info"
        title="Reativar Processo"
        message={`Deseja reativar o processo ${processo.numeroProcesso}?`}
        details={[
          `Custodiado: ${processo.custodiadoNome}`,
          `Situação atual: ${processo.situacaoProcesso}`,
          'O processo voltará a aparecer na listagem ativa.',
        ]}
        confirmText="Sim, Reativar"
        cancelText="Cancelar"
      />
    </>
  );
}
