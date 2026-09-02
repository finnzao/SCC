'use client';

import type { ExecucaoPenal } from '@/types/execucao';
import { formatToBrazilianDate } from '@/lib/utils/dateutils';

const SITUACAO_CORES: Record<string, string> = {
  EM_CUMPRIMENTO: 'bg-green-100 text-green-800',
  AGUARDANDO_JUSTIFICACAO: 'bg-amber-100 text-amber-800',
  SUSPENSA: 'bg-gray-200 text-gray-700',
  REGREDIDA: 'bg-red-100 text-red-800',
  EXTINTA: 'bg-blue-100 text-blue-800',
};

export function SituacaoExecucaoBadge({ execucao }: { execucao: ExecucaoPenal }) {
  return (
    <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' +
        (SITUACAO_CORES[execucao.situacaoExecucao] || 'bg-gray-100 text-gray-700')}>
      {execucao.situacaoDescricao}
    </span>
  );
}

export function BarraProgressoPena({ execucao, compact = false }: { execucao: ExecucaoPenal; compact?: boolean }) {
  const percentual = Math.min(100, Math.round((execucao.diasCumpridos / execucao.penaTotalDias) * 100));
  const d60 = execucao.situacaoExecucao === 'EM_CUMPRIMENTO' && execucao.diasRestantes <= 60;

  return (
    <div className={compact ? '' : 'space-y-1'}>
      <div className="flex justify-between items-center text-xs text-gray-600">
        <span>{execucao.diasCumpridos} de {execucao.penaTotalDias} dias ({percentual}%)</span>
        <span className={d60 ? 'text-red-600 font-semibold' : ''}>
          término {formatToBrazilianDate(execucao.dataTerminoPrevista)}
          {d60 && ' · D-' + execucao.diasRestantes}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={'h-full rounded-full ' + (d60 ? 'bg-red-500' : 'bg-purple-600')}
          style={{ width: percentual + '%' }}
        />
      </div>
      {!compact && (execucao.diasDetraidos > 0 || execucao.diasRemidos > 0) && (
        <p className="text-xs text-gray-500">
          Abatimentos: {execucao.diasDetraidos} detraídos · {execucao.diasRemidos} remidos
          {' '}(término original {formatToBrazilianDate(execucao.dataTerminoOriginal)})
        </p>
      )}
    </div>
  );
}
