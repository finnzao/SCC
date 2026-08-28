// components/SituacaoBadge.tsx - Badge para situação do processo
'use client';

import type { NaturezaVinculo, SituacaoProcesso, StatusComparecimento } from '@/types/processo';
import { NATUREZA_VINCULO_CONFIG, SITUACAO_PROCESSO_CONFIG, STATUS_COMPARECIMENTO_CONFIG } from '@/types/processo';

interface SituacaoBadgeProps {
  situacao: SituacaoProcesso;
  size?: 'sm' | 'md';
}

export function SituacaoBadge({ situacao, size = 'sm' }: SituacaoBadgeProps) {
  const config = SITUACAO_PROCESSO_CONFIG[situacao] || SITUACAO_PROCESSO_CONFIG.ATIVO;
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${config.bgColor} ${config.color}`}>
      {config.label}
    </span>
  );
}

interface NaturezaBadgeProps {
  natureza: NaturezaVinculo | null | undefined;
  size?: 'sm' | 'md';
}

export function NaturezaBadge({ natureza, size = 'sm' }: NaturezaBadgeProps) {
  const config = NATUREZA_VINCULO_CONFIG[natureza || 'CAUTELAR'] || NATUREZA_VINCULO_CONFIG.CAUTELAR;
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${config.bgColor} ${config.color}`}>
      {config.label}
    </span>
  );
}

interface StatusBadgeProps {
  status: StatusComparecimento | string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const normalizedStatus = status?.toUpperCase() === 'EM_CONFORMIDADE' || status?.toUpperCase() === 'EM CONFORMIDADE'
    ? 'EM_CONFORMIDADE'
    : 'INADIMPLENTE';

  const config = STATUS_COMPARECIMENTO_CONFIG[normalizedStatus as StatusComparecimento];
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${config.bgColor} ${config.color}`}>
      {config.label}
    </span>
  );
}
