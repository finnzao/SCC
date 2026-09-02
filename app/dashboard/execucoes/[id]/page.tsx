'use client';

// Ficha da execucao: pena, progresso e incidentes. Decisao de desfecho: so ADMIN.

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Gavel, Loader2, Plus, Scale } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { execucaoService } from '@/services/execucaoService';
import { BarraProgressoPena, SituacaoExecucaoBadge } from '@/components/BarraProgressoPena';
import { formatToBrazilianDate } from '@/lib/utils/dateutils';
import { ApenasDigitos } from '@/lib/utils/validation';
import type {
  ExecucaoPenal, Incidente, ResultadoIncidente, TipoIncidente,
} from '@/types/execucao';

const TIPOS: Array<{ value: TipoIncidente; label: string }> = [
  { value: 'DESCUMPRIMENTO_COMPARECIMENTO', label: 'Descumprimento de comparecimento' },
  { value: 'MUDANCA_NAO_AUTORIZADA', label: 'Mudança de endereço não autorizada' },
  { value: 'NOVO_CRIME', label: 'Notícia de novo crime' },
  { value: 'PEDIDO_AUTORIZACAO_VIAGEM', label: 'Pedido de autorização de viagem' },
  { value: 'EXTINCAO_PUNIBILIDADE', label: 'Extinção da punibilidade' },
  { value: 'OUTRO', label: 'Outro' },
];

const RESULTADOS: Array<{ value: ResultadoIncidente; label: string }> = [
  { value: 'JUSTIFICADO', label: 'Justificado — volta ao normal' },
  { value: 'NAO_JUSTIFICADO', label: 'Não justificado — aguarda regressão' },
  { value: 'ADVERTENCIA', label: 'Advertência' },
  { value: 'REGRESSAO_DECRETADA', label: 'Regressão decretada' },
  { value: 'EXTINCAO_DECLARADA', label: 'Extinção declarada' },
  { value: 'ARQUIVADO', label: 'Arquivado' },
];

export default function FichaExecucaoPage() {
  const params = useParams<{ id: string }>();
  const execucaoId = Number(params.id);
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.tipo === 'ADMIN';

  const [execucao, setExecucao] = useState<ExecucaoPenal | null>(null);
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [tipo, setTipo] = useState<TipoIncidente>('DESCUMPRIMENTO_COMPARECIMENTO');
  const [dataOcorrencia, setDataOcorrencia] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataAudiencia, setDataAudiencia] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [decidindoId, setDecidindoId] = useState<number | null>(null);
  const [resultado, setResultado] = useState<ResultadoIncidente>('JUSTIFICADO');
  const [dataDecisao, setDataDecisao] = useState('');

  const [mostrarRemicao, setMostrarRemicao] = useState(false);
  const [modoRemicao, setModoRemicao] = useState<'CALCULAR' | 'MANUAL'>('CALCULAR');
  const [diasTrabalhados, setDiasTrabalhados] = useState('');
  const [horasEstudo, setHorasEstudo] = useState('');
  const [diasManual, setDiasManual] = useState('');
  const [lancandoRemicao, setLancandoRemicao] = useState(false);

  const carregar = useCallback(async () => {
    const [e, i] = await Promise.all([
      execucaoService.buscarPorId(execucaoId),
      execucaoService.listarIncidentes(execucaoId),
    ]);
    if (e.success) setExecucao((e.data as { data?: ExecucaoPenal })?.data ?? null);
    if (i.success) setIncidentes((i.data as { data?: Incidente[] })?.data ?? []);
    setCarregando(false);
  }, [execucaoId]);

  useEffect(() => { carregar(); }, [carregar]);

  const registrarIncidente = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!dataOcorrencia || !descricao.trim()) {
      showToast({ type: 'error', title: 'Campos obrigatórios', message: 'Informe data e descrição.', duration: 4000 });
      return;
    }
    setSalvando(true);
    const resp = await execucaoService.registrarIncidente(execucaoId, {
      tipo, dataOcorrencia, descricao: descricao.trim(),
      ...(dataAudiencia ? { dataAudiencia } : {}),
    });
    setSalvando(false);
    if (resp.success) {
      showToast({ type: 'success', title: 'Incidente registrado', message: 'Ocorrência registrada.', duration: 3000 });
      setMostrarForm(false);
      setDescricao(''); setDataOcorrencia(''); setDataAudiencia('');
      carregar();
    } else {
      showToast({ type: 'error', title: 'Erro', message: resp.error || 'Erro ao registrar', duration: 5000 });
    }
  };

  // LEP 126: 3 dias trabalhados ou 12h de estudo = 1 dia (preview; o backend recalcula)
  const previewRemicao =
    Math.floor((parseInt(diasTrabalhados, 10) || 0) / 3) +
    Math.floor((parseInt(horasEstudo, 10) || 0) / 12);

  const diasAplicar = modoRemicao === 'MANUAL' ? (parseInt(diasManual, 10) || 0) : previewRemicao;

  const novoTerminoPrevisto = (() => {
    if (!execucao || diasAplicar <= 0) return null;
    const d = new Date(execucao.dataTerminoPrevista + 'T00:00:00');
    d.setDate(d.getDate() - diasAplicar);
    return d.toISOString().slice(0, 10);
  })();

  const lancarRemicao = async () => {
    const payload =
      modoRemicao === 'MANUAL'
        ? { dias: parseInt(diasManual, 10) || 0 }
        : { diasTrabalhados: parseInt(diasTrabalhados, 10) || 0, horasEstudo: parseInt(horasEstudo, 10) || 0 };
    if ((modoRemicao === 'MANUAL' && !(payload.dias! > 0)) || (modoRemicao === 'CALCULAR' && previewRemicao === 0)) {
      showToast({ type: 'error', title: 'Valores insuficientes', message: 'Os valores informados não somam nenhum dia de remição.', duration: 4000 });
      return;
    }
    setLancandoRemicao(true);
    const resp = await execucaoService.lancarRemicao(execucaoId, payload);
    setLancandoRemicao(false);
    if (resp.success) {
      showToast({ type: 'success', title: 'Remição lançada', message: 'Término previsto recalculado.', duration: 3000 });
      setMostrarRemicao(false);
      setDiasTrabalhados(''); setHorasEstudo(''); setDiasManual('');
      carregar();
    } else {
      showToast({ type: 'error', title: 'Erro', message: resp.error || 'Erro ao lançar remição', duration: 5000 });
    }
  };

  const registrarDecisao = async (incidenteId: number) => {
    if (!dataDecisao) {
      showToast({ type: 'error', title: 'Data obrigatória', message: 'Informe a data da decisão.', duration: 4000 });
      return;
    }
    const resp = await execucaoService.registrarResultado(incidenteId, { resultado, dataDecisao });
    if (resp.success) {
      showToast({ type: 'success', title: 'Decisão registrada', message: 'Situação da execução atualizada.', duration: 3000 });
      if (resultado === 'EXTINCAO_DECLARADA') {
        showToast({ type: 'info', title: 'Pena extinta', message: 'Sem outro processo ativo, considere arquivar o custodiado (motivo: extinção da punibilidade).', duration: 8000 });
      }
      setDecidindoId(null); setDataDecisao('');
      carregar();
    } else {
      showToast({ type: 'error', title: 'Erro', message: resp.error || 'Erro ao registrar decisão', duration: 5000 });
    }
  };

  if (carregando) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;
  }
  if (!execucao) {
    return <p className="p-6 text-red-600">Execução não encontrada.</p>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <Link href="/dashboard/execucoes" className="inline-flex items-center gap-1 text-sm text-purple-700 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Execuções
      </Link>

      <div className="bg-white rounded-xl shadow p-5 space-y-4">
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-3">
            <Gavel className="w-8 h-8 text-purple-700" />
            <div>
              <h1 className="text-xl font-bold">{execucao.custodiadoNome || 'Pessoa Monitorada'}</h1>
              <p className="text-sm text-gray-500 font-mono">
                PEC {execucao.numeroExecucao} · processo {execucao.numeroProcesso}
              </p>
              {execucao.numeroSeeu && (
                <p className="text-xs text-gray-400 font-mono">SEEU {execucao.numeroSeeu}</p>
              )}
            </div>
          </div>
          <SituacaoExecucaoBadge execucao={execucao} />
        </div>

        <BarraProgressoPena execucao={execucao} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><p className="text-gray-500">Início</p><p className="font-medium">{formatToBrazilianDate(execucao.dataInicioCumprimento)}</p></div>
          <div><p className="text-gray-500">Pena</p><p className="font-medium">{execucao.penaTotalDias} dias</p></div>
          <div><p className="text-gray-500">Restantes</p><p className="font-medium">{execucao.diasRestantes} dias</p></div>
          <div><p className="text-gray-500">Origem</p><p className="font-medium">{execucao.origemCalculo === 'SENTENCA' ? 'Data da sentença' : 'Dosimetria'}</p></div>
        </div>

        {isAdmin && execucao.situacaoExecucao === 'EM_CUMPRIMENTO' && (
          <div className="border-t pt-3">
            {!mostrarRemicao ? (
              <button onClick={() => setMostrarRemicao(true)} className="text-sm text-purple-700 hover:underline">
                Lançar remição de pena
              </button>
            ) : (
              <div className="bg-purple-50 rounded-lg p-4 space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setModoRemicao('CALCULAR')}
                    className={'px-3 py-1.5 rounded-lg text-sm ' + (modoRemicao === 'CALCULAR' ? 'bg-purple-700 text-white' : 'bg-white border')}
                  >
                    Calcular pelo sistema
                  </button>
                  <button
                    onClick={() => setModoRemicao('MANUAL')}
                    className={'px-3 py-1.5 rounded-lg text-sm ' + (modoRemicao === 'MANUAL' ? 'bg-purple-700 text-white' : 'bg-white border')}
                  >
                    Informar dias direto
                  </button>
                </div>

                {modoRemicao === 'CALCULAR' ? (
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-medium mb-1">Dias trabalhados</label>
                      <input type="text" inputMode="numeric" value={diasTrabalhados}
                             onChange={e => setDiasTrabalhados(ApenasDigitos(e.target.value))}
                             className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Horas de estudo</label>
                      <input type="text" inputMode="numeric" value={horasEstudo}
                             onChange={e => setHorasEstudo(ApenasDigitos(e.target.value))}
                             className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" placeholder="0" />
                    </div>
                    <p className="col-span-2 text-xs text-gray-500">
                      3 dias trabalhados ou 12h de estudo = 1 dia remido (LEP 126)
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium mb-1">Dias a subtrair (já calculados)</label>
                    <input type="text" inputMode="numeric" value={diasManual}
                           onChange={e => setDiasManual(ApenasDigitos(e.target.value))}
                           className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" placeholder="0" />
                  </div>
                )}

                <div className={'rounded-lg p-3 text-sm ' + (diasAplicar > 0 ? 'bg-white border border-purple-300 text-purple-900' : 'bg-white/60 text-gray-500')}>
                  {diasAplicar > 0 && novoTerminoPrevisto ? (
                    <>
                      <strong>{diasAplicar} dia(s) de remição</strong> · término previsto:{' '}
                      <span className="line-through text-gray-400">{formatToBrazilianDate(execucao.dataTerminoPrevista)}</span>
                      {' → '}<strong>{formatToBrazilianDate(novoTerminoPrevisto)}</strong>
                    </>
                  ) : (
                    'Preencha os valores para ver a remição e o novo término.'
                  )}
                </div>

                <p className="text-xs text-gray-600">
                  Lançamento de decisão judicial — o sistema converte os valores, não decide a remição.
                </p>
                <div className="flex gap-2">
                  <button onClick={lancarRemicao} disabled={lancandoRemicao}
                          className="bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-purple-800 disabled:opacity-60">
                    {lancandoRemicao ? 'Lançando…' : 'Lançar remição'}
                  </button>
                  <button onClick={() => setMostrarRemicao(false)} className="border px-3 py-1.5 rounded-lg text-sm bg-white">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold flex items-center gap-2"><Scale className="w-5 h-5 text-purple-700" /> Incidentes</h2>
          <button
            onClick={() => setMostrarForm(v => !v)}
            className="flex items-center gap-1 text-sm bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-100"
          >
            <Plus className="w-4 h-4" /> Registrar incidente
          </button>
        </div>

        {mostrarForm && (
          <form onSubmit={registrarIncidente} className="border rounded-lg p-4 space-y-3 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select value={tipo} onChange={e => setTipo(e.target.value as TipoIncidente)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Data da ocorrência</label>
                <input type="date" value={dataOcorrencia} onChange={e => setDataOcorrencia(e.target.value)}
                       className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Audiência marcada (opcional)</label>
                <input type="date" value={dataAudiencia} onChange={e => setDataAudiencia(e.target.value)}
                       className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descrição</label>
              <textarea maxLength={1000} rows={2} value={descricao} onChange={e => setDescricao(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            </div>
            <button type="submit" disabled={salvando}
                    className="bg-purple-700 text-white px-4 py-2 rounded-lg hover:bg-purple-800 disabled:opacity-60">
              {salvando ? 'Registrando…' : 'Registrar'}
            </button>
          </form>
        )}

        {incidentes.length === 0 && <p className="text-sm text-gray-500">Nenhum incidente registrado.</p>}

        <div className="space-y-3">
          {incidentes.map(i => (
            <div key={i.id} className="border rounded-lg p-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-medium text-sm">{i.tipoDescricao}</p>
                  <p className="text-xs text-gray-500">
                    Ocorrência {formatToBrazilianDate(i.dataOcorrencia)} · por {i.registradoPor}
                    {i.dataAudiencia && ' · audiência ' + formatToBrazilianDate(i.dataAudiencia)}
                  </p>
                </div>
                <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' +
                    (i.resultado === 'AGUARDANDO' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700')}>
                  {i.resultadoDescricao}
                </span>
              </div>
              <p className="text-sm mt-1">{i.descricao}</p>
              {i.dataDecisao && (
                <p className="text-xs text-gray-500 mt-1">
                  Decidido em {formatToBrazilianDate(i.dataDecisao)}{i.decididoPor && ' por ' + i.decididoPor}
                </p>
              )}

              {isAdmin && i.resultado === 'AGUARDANDO' && (
                decidindoId === i.id ? (
                  <div className="mt-3 border-t pt-3 grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="block text-xs font-medium mb-1">Desfecho decidido pelo juízo</label>
                      <select value={resultado} onChange={e => setResultado(e.target.value as ResultadoIncidente)}
                              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white">
                        {RESULTADOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Data da decisão</label>
                      <input type="date" value={dataDecisao} onChange={e => setDataDecisao(e.target.value)}
                             className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => registrarDecisao(i.id)}
                              className="bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-purple-800">
                        Registrar decisão
                      </button>
                      <button onClick={() => setDecidindoId(null)}
                              className="border px-3 py-1.5 rounded-lg text-sm">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setDecidindoId(i.id)}
                          className="mt-2 text-sm text-purple-700 hover:underline">
                    Registrar decisão do juízo
                  </button>
                )
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
          O sistema registra, não decide: regressão exige audiência de justificação prévia
          (LEP art. 118, §2º) e só muda a situação quando a decisão do juízo é registrada
          por um administrador.
        </p>
      </div>
    </div>
  );
}
