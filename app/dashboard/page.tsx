/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo, useCallback } from 'react';
import { AlertCircle, RefreshCw, Activity, Inbox, UserPlus } from 'lucide-react';
import { useResumoSistema } from '@/hooks/useAPI';
import Link from 'next/link';
import {
  StatsCards,
  AnaliseAtrasos,
  StatusPieChart,
  TendenciaChart,
  AcoesRapidas,
  MobileDashboard,
  EMPTY_STATS,
} from '@/components/dashboard';
import type { DashboardStats, TendenciaData } from '@/components/dashboard';

export default function DashboardPage() {
  const { resumo, loading: loadingResumo, error: errorResumo, refetch } = useResumoSistema();

  const stats = useMemo<DashboardStats>(() => {
    if (!resumo || loadingResumo) return EMPTY_STATS;
    return {
      total: resumo.totalCustodiados ?? 0,
      emConformidade: resumo.custodiadosEmConformidade ?? 0,
      inadimplentes: resumo.custodiadosInadimplentes ?? 0,
      proximosPrazos: resumo.proximosComparecimentos?.totalPrevistoProximosDias ?? 0,
      comparecimentosHoje: resumo.comparecimentosHoje ?? 0,
      atrasados: resumo.proximosComparecimentos?.totalAtrasados ?? 0,
      percentualConformidade: resumo.percentualConformidade ?? 0,
      percentualInadimplencia: resumo.percentualInadimplencia ?? 0,
      totalComparecimentos: resumo.totalComparecimentos ?? 0,
      comparecimentosEsteMes: resumo.comparecimentosEsteMes ?? 0,
    };
  }, [resumo, loadingResumo]);

  const tendenciaData = useMemo<TendenciaData[]>(() => {
    if (!resumo || loadingResumo || !Array.isArray(resumo.tendenciaConformidade)) return [];
    return resumo.tendenciaConformidade.map((item: any) => ({
      mes: item.mes,
      mesNome: item.mesNome,
      conformidade: item.taxaConformidade ?? 0,
      inadimplencia: item.taxaInadimplencia ?? 0,
      comparecimentos: item.totalComparecimentos ?? 0,
    }));
  }, [resumo, loadingResumo]);

  const analiseAtrasos = useMemo(() => {
    if (!resumo || loadingResumo) return null;
    return resumo.analiseAtrasos || null;
  }, [resumo, loadingResumo]);

  const mediaDiasAtraso = useMemo(() => {
    if (!analiseAtrasos) return null;
    return Math.round(analiseAtrasos.mediaDiasAtraso);
  }, [analiseAtrasos]);

  const totalAtrasados = useMemo(() => {
    return analiseAtrasos?.totalCustodiadosAtrasados ?? stats.atrasados;
  }, [analiseAtrasos, stats.atrasados]);

  const handleRefresh = useCallback(async () => {
    try { await refetch(); } catch { /* ignore */ }
  }, [refetch]);

  const hasData = stats.total > 0;

  if (loadingResumo) {
    return (
      <div className="p-4 md:p-6 space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-lg text-gray-600">Carregando resumo do sistema...</p>
            <p className="text-sm text-gray-500 mt-2">Obtendo dados do servidor</p>
          </div>
        </div>
      </div>
    );
  }

  if (errorResumo) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto mt-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="text-red-800 font-semibold">Erro ao carregar resumo do sistema</h3>
          </div>
          <p className="text-red-600 mb-4">{errorResumo}</p>
          <button onClick={handleRefresh} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <MobileDashboard
        stats={stats}
        analiseAtrasos={analiseAtrasos}
        totalAtrasados={totalAtrasados}
        onRefresh={handleRefresh}
      />

      {/* Desktop */}
      <div className="hidden md:block max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary-dark flex items-center gap-3">
              <Activity className="w-8 h-8" />
              Dashboard do Sistema
            </h1>
            <p className="text-text-muted mt-1">Visão geral do sistema de controle de comparecimentos</p>
          </div>
        </div>

        {!hasData && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum dado disponível</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              O sistema ainda não possui custodiados cadastrados. Comece cadastrando uma nova pessoa para visualizar os dados do dashboard.
            </p>
            <Link href="/dashboard/registrar" className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors font-medium">
              <UserPlus className="w-5 h-5" />
              Cadastrar Primeira Pessoa
            </Link>
          </div>
        )}

        {hasData && (
          <>
            <StatsCards stats={stats} mediaDiasAtraso={mediaDiasAtraso} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnaliseAtrasos analise={analiseAtrasos} />
              <StatusPieChart emConformidade={stats.emConformidade} inadimplentes={stats.inadimplentes} />
            </div>

            <TendenciaChart tendencia={tendenciaData} relatorio={resumo?.relatorioUltimosMeses} />
          </>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AcoesRapidas comparecimentosHoje={stats.comparecimentosHoje} />
        </div>
      </div>
    </>
  );
}
