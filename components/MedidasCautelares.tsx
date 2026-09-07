'use client';

// Camada da custodia: registra o que o juiz impos; o sistema fiscaliza so o comparecimento.

import { useCallback, useEffect, useState } from 'react';
import { Scale, Plus, Loader2 } from 'lucide-react';
import { medidasService, TIPOS_MEDIDA, type MedidaCautelar } from '@/services/medidasService';
import { useToastHelpers } from '@/components/Toast';
import { usePermissions } from '@/contexts/AuthContext';

const fmtBR = (d?: string | null) => {
  if (!d) return '—';
  const [y, m, dia] = d.split('-');
  return `${dia}/${m}/${y}`;
};

export default function MedidasCautelares({ processoId }: { processoId: number }) {
  const { success, error: showError } = useToastHelpers();
  const { isAdmin } = usePermissions();

  const [medidas, setMedidas] = useState<MedidaCautelar[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [tipoMedida, setTipoMedida] = useState('COMPARECIMENTO_PERIODICO');
  const [dataImposicao, setDataImposicao] = useState('');
  const [detalhe, setDetalhe] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await medidasService.listar(processoId);
      const bruto: unknown = r.data?.data ?? r.data ?? [];
      setMedidas(Array.isArray(bruto) ? (bruto as MedidaCautelar[]) : []);
    } catch {
      setMedidas([]);
    } finally {
      setLoading(false);
    }
  }, [processoId]);

  useEffect(() => { carregar(); }, [carregar]);

  const handleRegistrar = async () => {
    if (!dataImposicao) { showError('Data obrigatória', 'Informe a data de imposição.'); return; }
    setSalvando(true);
    try {
      const r = await medidasService.registrar(processoId, {
        tipoMedida, dataImposicao, detalhe: detalhe.trim() || undefined,
      });
      if (r.success) {
        success('Medida registrada', 'A medida foi anotada no processo.');
        setMostrarForm(false); setDetalhe(''); setDataImposicao('');
        carregar();
      } else showError('Erro', r.message || 'Erro ao registrar medida');
    } finally {
      setSalvando(false);
    }
  };

  const handleRevogar = async (m: MedidaCautelar) => {
    const hoje = new Date().toISOString().split('T')[0];
    const r = await medidasService.revogar(m.id, hoje);
    if (r.success) { success('Medida revogada', 'Revogação registrada com a data de hoje.'); carregar(); }
    else showError('Erro', r.message || 'Erro ao revogar');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />Medidas impostas
          {!loading && <span className="text-xs font-normal text-gray-400">({medidas.length})</span>}
        </h4>
        {isAdmin() && (
          <button onClick={() => setMostrarForm(v => !v)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark font-medium">
            <Plus className="w-3.5 h-3.5" />Registrar medida
          </button>
        )}
      </div>

      {mostrarForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select value={tipoMedida} onChange={e => setTipoMedida(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white">
              {TIPOS_MEDIDA.map(t => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
            </select>
            <input type="date" value={dataImposicao} onChange={e => setDataImposicao(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white" />
          </div>
          <input type="text" value={detalhe} onChange={e => setDetalhe(e.target.value)} maxLength={500}
            placeholder="Detalhe (ex.: não frequentar bares; distância mínima de 200m)"
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
          <div className="flex gap-2">
            <button onClick={handleRegistrar} disabled={salvando}
              className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50">
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => setMostrarForm(false)}
              className="border px-3 py-1.5 rounded-lg text-xs bg-white">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
          <Loader2 className="w-4 h-4 animate-spin" />Carregando...
        </div>
      ) : medidas.length === 0 ? (
        <p className="text-xs text-gray-400 py-1">
          Nenhuma medida registrada. O comparecimento periódico é fiscalizado pelo sistema;
          as demais medidas são informativas.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {medidas.map(m => (
            <li key={m.id} className="py-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-sm ${m.vigente ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                  {m.descricao} <span className="text-xs text-gray-400">({m.baseLegal})</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Imposta em {fmtBR(m.dataImposicao)}
                  {m.dataRevogacao && ` · revogada em ${fmtBR(m.dataRevogacao)}`}
                  {m.detalhe && ` · ${m.detalhe}`}
                </p>
              </div>
              {m.vigente && isAdmin() && (
                <button onClick={() => handleRevogar(m)}
                  className="text-xs text-red-500 hover:text-red-700 flex-shrink-0">Revogar</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
