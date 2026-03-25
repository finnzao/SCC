/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import { httpClient } from '@/lib/http/client';

export interface ProcessoResumo {
  id: number;
  numeroProcesso: string;
  vara: string;
  comarca: string;
  periodicidade: number;
  status: string;
  proximoComparecimento: string;
  situacaoProcesso: string;
}

export interface ResultadoBusca {
  custodiadoId: number;
  custodiadoNome: string;
  custodiadoCpf: string;
  processos: ProcessoResumo[];
}

export interface UseBuscaInteligenteRetorno {
  resultados: ResultadoBusca[];
  loading: boolean;
  error: string | null;
  tipoDetectado: 'nome' | 'cpf' | 'processo' | 'incompleto' | 'vazio';
  totalResultados: number;
  limpar: () => void;
}

function detectarTipo(termo: string): 'nome' | 'cpf' | 'processo' | 'incompleto' | 'vazio' {
  const trimmed = termo.trim();
  if (!trimmed) return 'vazio';

  const temLetras = /[a-zA-ZÀ-ÿ]/.test(trimmed);
  if (temLetras) return 'nome';

  const apenasNumeros = trimmed.replace(/\D/g, '');
  const len = apenasNumeros.length;

  if (len === 11) return 'cpf';
  if (len === 20) return 'processo';
  if ((len >= 1 && len <= 10) || (len >= 12 && len <= 19)) return 'incompleto';

  return 'vazio';
}

export function agruparPorCustodiado(dados: any[]): ResultadoBusca[] {
  if (!Array.isArray(dados) || dados.length === 0) return [];

  const mapa = new Map<number, ResultadoBusca>();

  for (const item of dados) {
    const custId = item.custodiadoId;
    if (!custId) continue;

    if (!mapa.has(custId)) {
      mapa.set(custId, {
        custodiadoId: custId,
        custodiadoNome: item.custodiadoNome || '',
        custodiadoCpf: item.custodiadoCpf || '',
        processos: [],
      });
    }

    const grupo = mapa.get(custId)!;
    grupo.processos.push({
      id: item.id,
      numeroProcesso: item.numeroProcesso || '',
      vara: item.vara || '',
      comarca: item.comarca || '',
      periodicidade: item.periodicidade || 0,
      status: item.status || '',
      proximoComparecimento: item.proximoComparecimento || '',
      situacaoProcesso: item.situacaoProcesso || '',
    });
  }

  return Array.from(mapa.values());
}

export function useBuscaInteligente(
  termo: string,
  opcoes?: { tamanho?: number }
): UseBuscaInteligenteRetorno {
  const tamanho = opcoes?.tamanho ?? 10;
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipoDetectado, setTipoDetectado] = useState<'nome' | 'cpf' | 'processo' | 'incompleto' | 'vazio'>('vazio');

  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limpar = () => {
    setResultados([]);
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const tipo = detectarTipo(termo);
    setTipoDetectado(tipo);

    if (tipo === 'vazio') {
      setResultados([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (tipo === 'incompleto') {
      setLoading(false);
      return;
    }

    if (tipo === 'nome' && termo.trim().length < 3) {
      setLoading(false);
      return;
    }

    const executarBusca = async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setLoading(true);
      setError(null);

      try {
        const response = await httpClient.get<any>('/processos', {
          termo: termo.trim(),
          page: 0,
          size: tamanho,
        });

        if (controller.signal.aborted) return;

        if (response.success && response.data) {
          const dados = response.data?.data?.processos
            || response.data?.processos
            || response.data?.data
            || response.data;

          const lista = Array.isArray(dados) ? dados : [];
          setResultados(agruparPorCustodiado(lista));
        } else {
          setResultados([]);
          if (response.message) {
            setError(response.message);
          }
        }
      } catch (err: any) {
        if (controller.signal.aborted) return;
        setError(err.message || 'Erro ao buscar');
        setResultados([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    if (tipo === 'cpf' || tipo === 'processo') {
      executarBusca();
    } else {
      setLoading(true);
      timerRef.current = setTimeout(() => {
        executarBusca();
      }, 500);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [termo, tamanho]);

  return {
    resultados,
    loading,
    error,
    tipoDetectado,
    totalResultados: resultados.reduce((acc, r) => acc + r.processos.length, 0),
    limpar,
  };
}
