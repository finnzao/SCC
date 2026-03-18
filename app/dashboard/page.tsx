/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  Users,
  CheckCircle,
  AlertTriangle,
  Calendar,
  TrendingUp,
  UserCheck,
  Clock,
  AlertCircle,
  ArrowRight,
  Search,
  ChevronRight,
  RefreshCw,
  Activity,
  FileText,
  Home,
  UserX,
  History,
  UserPlus,
  ListFilter,
  Zap,
  Inbox
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useResumoSistema } from '@/hooks/useAPI';
import Link from 'next/link';

interface DashboardStats {
  total: number;
  emConformidade: number;
  inadimplentes: number;
  proximosPrazos: number;
  comparecimentosHoje: number;
  atrasados: number;
  percentualConformidade: number;
  percentualInadimplencia: number;
  totalComparecimentos: number;
  comparecimentosEsteMes: number;
}

interface TendenciaData {
  mes: string;
  mesNome: string;
  conformidade: number;
  inadimplencia: number;
  comparecimentos: number;
}

interface ProximoComparecimento {
  id?: number;
  nome: string;
  processo: string;
  proximoComparecimento: string;
  status: string;
  vara?: string;
  comarca?: string;
  atrasado?: boolean;
  diasAtraso?: number;
  comparecimentoHoje?: boolean;
}

const EMPTY_STATS: DashboardStats = {
  total: 0,
  emConformidade: 0,
  inadimplentes: 0,
  proximosPrazos: 0,
  comparecimentosHoje: 0,
  atrasados: 0,
  percentualConformidade: 0,
  percentualInadimplencia: 0,
  totalComparecimentos: 0,
  comparecimentosEsteMes: 0
};

export default function DashboardPage() {
  const { resumo, loading: loadingResumo, error: errorResumo, refetch } = useResumoSistema();

  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [alertasUrgentes, setAlertasUrgentes] = useState<ProximoComparecimento[]>([]);
  const [tendenciaData, setTendenciaData] = useState<TendenciaData[]>([]);
  const [analiseAtrasos, setAnaliseAtrasos] = useState<any>(null);

  const hasData = stats.total > 0;

  useEffect(() => {
    if (resumo && !loadingResumo) {
      console.log('[Dashboard] Processando resumo do sistema:', resumo);

      const totalCustodiados = resumo.totalCustodiados ?? 0;
      const emConformidade = resumo.custodiadosEmConformidade ?? 0;
      const inadimplentes = resumo.custodiadosInadimplentes ?? 0;

      setStats({
        total: totalCustodiados,
        emConformidade,
        inadimplentes,
        proximosPrazos: resumo.proximosComparecimentos?.totalPrevistoProximosDias ?? 0,
        comparecimentosHoje: resumo.comparecimentosHoje ?? 0,
        atrasados: resumo.proximosComparecimentos?.totalAtrasados ?? 0,
        percentualConformidade: resumo.percentualConformidade ?? 0,
        percentualInadimplencia: resumo.percentualInadimplencia ?? 0,
        totalComparecimentos: resumo.totalComparecimentos ?? 0,
        comparecimentosEsteMes: resumo.comparecimentosEsteMes ?? 0
      });

      if (resumo.tendenciaConformidade && Array.isArray(resumo.tendenciaConformidade)) {
        setTendenciaData(resumo.tendenciaConformidade.map((item: any) => ({
          mes: item.mes,
          mesNome: item.mesNome,
          conformidade: item.taxaConformidade ?? 0,
          inadimplencia: item.taxaInadimplencia ?? 0,
          comparecimentos: item.totalComparecimentos ?? 0
        })));
      } else {
        setTendenciaData([]);
      }

      if (resumo.analiseAtrasos) {
        setAnaliseAtrasos(resumo.analiseAtrasos);
      } else {
        setAnaliseAtrasos(null);
      }

      let alertas: ProximoComparecimento[] = [];

      if (resumo.proximosComparecimentos?.custodiadosAtrasados) {
        alertas = resumo.proximosComparecimentos.custodiadosAtrasados.slice(0, 5).map((item: any) => ({
          id: item.id,
          nome: item.nome,
          processo: item.processo,
          proximoComparecimento: item.dataProximoComparecimento || '',
          status: item.diasAtraso > 0 ? 'Atrasado' : 'Em dia',
          vara: item.vara,
          comarca: item.comarca,
          atrasado: item.diasAtraso > 0,
          diasAtraso: item.diasAtraso ?? 0,
          comparecimentoHoje: false
        }));
      }

      setAlertasUrgentes(alertas);
    } else if (!loadingResumo && !resumo) {
      setStats(EMPTY_STATS);
      setAlertasUrgentes([]);
      setTendenciaData([]);
      setAnaliseAtrasos(null);
    }
  }, [resumo, loadingResumo]);

  const dataPieChart = [
    { name: 'Em Conformidade', value: stats.emConformidade, color: '#7ED6A7' },
    { name: 'Inadimplentes', value: stats.inadimplentes, color: '#E57373' },
  ];

  const hasPieData = dataPieChart.some(d => d.value > 0);

  const createFilterLink = (params: Record<string, string>) => {
    const searchParams = new URLSearchParams(params);
    return `/dashboard/geral?${searchParams.toString()}`;
  };

  const handleRefresh = async () => {
    console.log('[Dashboard] Atualizando resumo do sistema...');
    try {
      await refetch();
      console.log('[Dashboard] Resumo atualizado com sucesso');
    } catch (error) {
      console.error('[Dashboard] Erro ao atualizar resumo:', error);
    }
  };

  if (loadingResumo) {
    return (
      <div className="p-4 md:p-6 space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
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
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const EmptyStateCard = () => (
    <div className="bg-white rounded-xl shadow-lg p-8 text-center">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Inbox className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum dado disponível</h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        O sistema ainda não possui custodiados cadastrados. Comece cadastrando uma nova pessoa para visualizar os dados do dashboard.
      </p>
      <Link
        href="/dashboard/registrar"
        className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors font-medium"
      >
        <UserPlus className="w-5 h-5" />
        Cadastrar Primeira Pessoa
      </Link>
    </div>
  );

  return (
    <>
      {/* Interface Mobile */}
      <div className="md:hidden min-h-screen bg-gray-50">
        {/* Header Mobile */}
        <div className="bg-gradient-to-r from-primary to-primary-dark sticky top-0 z-10 shadow-lg">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <Home className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Dashboard</h1>
                  <p className="text-xs text-white/80">
                    {new Date().toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                title="Atualizar dados"
              >
                <RefreshCw className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Resumo Rápido no Header */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 text-center">
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-[10px] text-white/90">Total</p>
              </div>
              <div className="bg-green-500/30 backdrop-blur-sm rounded-lg p-2 text-center">
                <p className="text-2xl font-bold text-white">{stats.emConformidade}</p>
                <p className="text-[10px] text-white/90">Conforme</p>
              </div>
              <div className="bg-red-500/30 backdrop-blur-sm rounded-lg p-2 text-center">
                <p className="text-2xl font-bold text-white">{stats.inadimplentes}</p>
                <p className="text-[10px] text-white/90">Pendentes</p>
              </div>
              <div className="bg-yellow-500/30 backdrop-blur-sm rounded-lg p-2 text-center">
                <p className="text-2xl font-bold text-white">{stats.comparecimentosHoje}</p>
                <p className="text-[10px] text-white/90">Hoje</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 pb-24">
          {/* Estado vazio mobile */}
          {!hasData && (
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-700 mb-2">Sem dados cadastrados</h3>
              <p className="text-sm text-gray-500 mb-4">
                Cadastre a primeira pessoa para começar a usar o sistema.
              </p>
              <Link
                href="/dashboard/registrar"
                className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                <UserPlus className="w-4 h-4" />
                Cadastrar Pessoa
              </Link>
            </div>
          )}

          {/* Ações Principais - Destaque */}
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-gray-800">Ações Rápidas</h2>
            </div>

            <div className="space-y-3">
              {/* Botão Principal - Confirmar Comparecimento */}
              <Link
                href="/dashboard/comparecimento/confirmar"
                className="block w-full bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl p-4 shadow-md active:scale-95 transition-transform"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-base">Confirmar Presença</p>
                      <p className="text-xs text-white/80">Registrar comparecimento</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </div>
              </Link>

              {/* Botão Secundário - Ver Todas as Pessoas */}
              <Link
                href="/dashboard/geral"
                className="block w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-md active:scale-95 transition-transform"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-base">Lista Completa</p>
                      <p className="text-xs text-white/80">Ver todos os custodiados</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </div>
              </Link>

              {/* Grid de Ações Secundárias */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Link
                  href="/dashboard/registrar"
                  className="bg-green-50 border-2 border-green-200 rounded-lg p-3 active:scale-95 transition-transform"
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-semibold text-green-700">Cadastrar</p>
                  </div>
                </Link>

                <Link
                  href={createFilterLink({ urgencia: 'hoje' })}
                  className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3 active:scale-95 transition-transform"
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-semibold text-yellow-700">Hoje ({stats.comparecimentosHoje})</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Alerta de Atrasados - só mostra se houver atrasados */}
          {alertasUrgentes.length > 0 && (
            <Link
              href={createFilterLink({ urgencia: 'atrasados' })}
              className="block bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 shadow-lg active:scale-95 transition-transform"
            >
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-base">
                      {analiseAtrasos?.totalCustodiadosAtrasados ?? stats.atrasados} em Atraso
                    </p>
                    <p className="text-xs text-white/80">
                      {analiseAtrasos ? `Média de ${Math.round(analiseAtrasos.mediaDiasAtraso)} dias` : 'Toque para ver detalhes'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5" />
              </div>
            </Link>
          )}

          {/* Estatísticas Detalhadas - só mostra se houver dados */}
          {hasData && (
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Estatísticas
              </h2>

              <div className="space-y-3">
                <Link
                  href={createFilterLink({ status: 'em conformidade' })}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg active:bg-green-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800">Em Conformidade</p>
                      <p className="text-xs text-green-600">{stats.percentualConformidade.toFixed(1)}% do total</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{stats.emConformidade}</p>
                  </div>
                </Link>

                <Link
                  href={createFilterLink({ urgencia: 'proximos' })}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg active:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="font-semibold text-blue-800">Próximos 7 Dias</p>
                      <p className="text-xs text-blue-600">Comparecimentos previstos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{stats.proximosPrazos}</p>
                  </div>
                </Link>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                    <div>
                      <p className="font-semibold text-purple-800">Este Mês</p>
                      <p className="text-xs text-purple-600">Comparecimentos realizados</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">{stats.comparecimentosEsteMes}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Análise de Atrasos Mobile - só mostra se houver dados */}
          {analiseAtrasos && analiseAtrasos.totalCustodiadosAtrasados > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <UserX className="w-5 h-5 text-red-600" />
                Análise de Atrasos
              </h2>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{analiseAtrasos.totalCustodiadosAtrasados}</p>
                  <p className="text-xs text-red-600">Total Atrasados</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-orange-600">{Math.round(analiseAtrasos.mediaDiasAtraso)}</p>
                  <p className="text-xs text-orange-600">Média de Dias</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Até 30 dias</span>
                  <span className="font-bold">{analiseAtrasos.totalAtrasados30Dias ?? 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">31 a 60 dias</span>
                  <span className="font-bold">{analiseAtrasos.totalAtrasados60Dias ?? 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">61 a 90 dias</span>
                  <span className="font-bold">{analiseAtrasos.totalAtrasados90Dias ?? 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm p-2 bg-red-50 rounded">
                  <span className="font-semibold text-red-700">Mais de 90 dias</span>
                  <span className="font-bold text-red-700">{analiseAtrasos.totalAtrasadosMais90Dias ?? 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Outras Ações */}
          <div className="bg-white rounded-xl shadow-lg p-4">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <ListFilter className="w-5 h-5 text-gray-600" />
              Outras Ações
            </h2>

            <div className="space-y-2">
              <Link
                href={createFilterLink({ status: 'inadimplente' })}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg active:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className="font-medium text-gray-700">Ver Inadimplentes</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                href="/dashboard/configuracoes"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg active:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-700">Configurações</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Mobile */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 safe-area-bottom">
          <p className="text-center text-xs text-gray-500">
            Última atualização: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Interface Desktop */}
      <div className="hidden md:block max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary-dark flex items-center gap-3">
              <Activity className="w-8 h-8" />
              Dashboard do Sistema
            </h1>
            <p className="text-text-muted mt-1">Visão geral do sistema de controle de comparecimentos</p>
          </div>
        </div>

        {/* Estado vazio desktop */}
        {!hasData && <EmptyStateCard />}

        {/* Cards de Estatísticas - só mostra se houver dados */}
        {hasData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Link href="/dashboard/geral">
              <Card className="p-6 border-l-4 border-l-primary hover:shadow-lg transition-all cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm font-medium">Total de Custodiados</p>
                    <p className="text-3xl font-bold text-primary-dark">{stats.total}</p>
                    <p className="text-sm text-text-muted mt-1">
                      {stats.totalComparecimentos} comparecimentos
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Users className="w-12 h-12 text-primary opacity-80" />
                    <ArrowRight className="w-4 h-4 text-primary ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            </Link>

            <Link href={createFilterLink({ status: 'em conformidade' })}>
              <Card className="p-6 border-l-4 border-l-secondary hover:shadow-lg transition-all cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm font-medium">Em Conformidade</p>
                    <p className="text-3xl font-bold text-secondary">{stats.emConformidade}</p>
                    <p className="text-sm text-secondary font-medium">{stats.percentualConformidade.toFixed(1)}% do total</p>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-12 h-12 text-secondary opacity-80" />
                    <ArrowRight className="w-4 h-4 text-secondary ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            </Link>

            <Link href={createFilterLink({ status: 'inadimplente' })}>
              <Card className="p-6 border-l-4 border-l-danger hover:shadow-lg transition-all cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm font-medium">Inadimplentes</p>
                    <p className="text-3xl font-bold text-danger">{stats.inadimplentes}</p>
                    <p className="text-sm text-danger font-medium">{stats.percentualInadimplencia.toFixed(1)}% do total</p>
                  </div>
                  <div className="flex items-center">
                    <AlertTriangle className="w-12 h-12 text-danger opacity-80" />
                    <ArrowRight className="w-4 h-4 text-danger ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            </Link>

            <Link href={createFilterLink({ urgencia: 'hoje' })}>
              <Card className="p-6 border-l-4 border-l-warning hover:shadow-lg transition-all cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm font-medium">Comparecimentos Hoje</p>
                    <p className="text-3xl font-bold text-warning">{stats.comparecimentosHoje}</p>
                    <p className="text-sm text-text-muted">Este mês: {stats.comparecimentosEsteMes}</p>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-12 h-12 text-warning opacity-80" />
                    <ArrowRight className="w-4 h-4 text-warning ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            </Link>

            <Link href={createFilterLink({ urgencia: 'atrasados' })}>
              <Card className="p-6 border-l-4 border-l-red-500 hover:shadow-lg transition-all cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm font-medium">Atrasados</p>
                    <p className="text-3xl font-bold text-red-500">{stats.atrasados}</p>
                    <p className="text-sm text-text-muted">
                      {analiseAtrasos ? `Média: ${Math.round(analiseAtrasos.mediaDiasAtraso)} dias` : 'Sem atrasos'}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 opacity-80" />
                    <ArrowRight className="w-4 h-4 text-red-500 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        )}

        {/* Análise de Atrasos e Gráfico de Distribuição - só mostra se houver dados */}
        {hasData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-primary-dark mb-4 flex items-center gap-2">
                <UserX className="w-5 h-5" />
                Análise de Atrasos
              </h3>

              {analiseAtrasos && analiseAtrasos.totalCustodiadosAtrasados > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-sm text-red-600">Total em Atraso</p>
                      <p className="text-2xl font-bold text-red-800">{analiseAtrasos.totalCustodiadosAtrasados}</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <p className="text-sm text-orange-600">Média de Dias</p>
                      <p className="text-2xl font-bold text-orange-800">{Math.round(analiseAtrasos.mediaDiasAtraso)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">Até 30 dias</span>
                      <span className="font-semibold">{analiseAtrasos.totalAtrasados30Dias ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">31 a 60 dias</span>
                      <span className="font-semibold">{analiseAtrasos.totalAtrasados60Dias ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">61 a 90 dias</span>
                      <span className="font-semibold">{analiseAtrasos.totalAtrasados90Dias ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <span className="text-sm font-medium text-red-700">Mais de 90 dias</span>
                      <span className="font-bold text-red-700">{analiseAtrasos.totalAtrasadosMais90Dias ?? 0}</span>
                    </div>
                  </div>

                  {analiseAtrasos.custodiadoMaiorAtraso && (
                    <div className="mt-4 p-3 bg-red-100 rounded-lg">
                      <p className="text-sm font-medium text-red-800 mb-1">Maior Atraso</p>
                      <p className="text-sm text-red-700">{analiseAtrasos.custodiadoMaiorAtraso.nome}</p>
                      <p className="text-xs text-red-600">{analiseAtrasos.custodiadoMaiorAtraso.diasAtraso} dias de atraso</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <CheckCircle className="w-12 h-12 mb-3 text-green-400" />
                  <p className="text-green-600 font-medium">Nenhum atraso registrado</p>
                  <p className="text-sm text-gray-500 mt-1">Todos os custodiados estão em dia</p>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-semibold text-primary-dark mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Distribuição de Status
              </h3>

              {hasPieData ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={dataPieChart}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {dataPieChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="mt-4 flex justify-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-sm">Em Conformidade ({stats.emConformidade})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="text-sm">Inadimplentes ({stats.inadimplentes})</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Inbox className="w-12 h-12 mb-3" />
                  <p className="text-gray-500 font-medium">Sem dados para exibir</p>
                  <p className="text-sm text-gray-400 mt-1">Cadastre custodiados para ver a distribuição</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Estatísticas dos Últimos 6 Meses - só mostra se houver dados de tendência */}
        {hasData && (
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-primary-dark mb-4 flex items-center gap-2">
              <History className="w-5 h-5" />
              Análise de Comparecimentos - Últimos 6 Meses
            </h3>

            {resumo?.relatorioUltimosMeses ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600">Total de Comparecimentos</p>
                  <p className="text-3xl font-bold text-blue-800">{resumo.relatorioUltimosMeses.totalComparecimentos ?? 0}</p>
                  <p className="text-xs text-blue-500 mt-1">Média: {resumo.relatorioUltimosMeses.mediaComparecimentosMensal ?? 0}/mês</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600">Comparecimentos Presenciais</p>
                  <p className="text-3xl font-bold text-green-800">{resumo.relatorioUltimosMeses.comparecimentosPresenciais ?? 0}</p>
                  <p className="text-xs text-green-500 mt-1">{(resumo.relatorioUltimosMeses.percentualPresencial ?? 0).toFixed(1)}% do total</p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600">Mudanças de Endereço</p>
                  <p className="text-3xl font-bold text-purple-800">{resumo.relatorioUltimosMeses.mudancasEndereco ?? 0}</p>
                  <p className="text-xs text-purple-500 mt-1">No período analisado</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm mb-4">
                Dados do relatório mensal não disponíveis
              </div>
            )}

            {tendenciaData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={tendenciaData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mesNome" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [
                    typeof value === 'number' ? value.toFixed(1) + '%' : value,
                    name
                  ]} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="conformidade"
                    stroke="#7ED6A7"
                    strokeWidth={3}
                    name="Conformidade (%)"
                  />
                  <Line
                    type="monotone"
                    dataKey="inadimplencia"
                    stroke="#E57373"
                    strokeWidth={3}
                    name="Inadimplência (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <TrendingUp className="w-12 h-12 mb-3" />
                <p className="text-gray-500 font-medium">Sem dados de tendência</p>
                <p className="text-sm text-gray-400 mt-1">Os dados de tendência aparecerão conforme os comparecimentos forem registrados</p>
              </div>
            )}
          </Card>
        )}

        {/* Seção de Ações */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-primary-dark mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Ações Rápidas
            </h3>
            <div className="space-y-3">
              <Link
                href="/dashboard/registrar"
                className="block w-full bg-secondary text-white py-3 rounded-lg hover:bg-green-600 transition-colors text-center"
              >
                <div className="flex items-center justify-center gap-2">
                  <Users className="w-5 h-5" />
                  Cadastrar Nova Pessoa
                </div>
              </Link>

              <Link
                href="/dashboard/comparecimento/confirmar"
                className="block w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-dark transition-colors text-center"
              >
                <div className="flex items-center justify-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Validação de Presença
                </div>
              </Link>

              <Link
                href={createFilterLink({ urgencia: 'hoje' })}
                className="block w-full bg-warning text-text-base py-3 rounded-lg hover:opacity-90 transition-colors text-center"
              >
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5" />
                  Comparecimentos de Hoje ({stats.comparecimentosHoje})
                </div>
              </Link>

              <Link
                href="/dashboard/geral"
                className="block w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors text-center"
              >
                <div className="flex items-center justify-center gap-2">
                  <Search className="w-5 h-5" />
                  Buscar e Filtrar Pessoas
                </div>
              </Link>

              <Link
                href="/dashboard/configuracoes"
                className="block w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors text-center"
              >
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5" />
                  Configurações do Sistema
                </div>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
