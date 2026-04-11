/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import {
  Users, CheckCircle, AlertTriangle, Calendar, TrendingUp,
  UserCheck, Clock, ChevronRight, RefreshCw, Activity,
  FileText, Home, UserX, UserPlus, ListFilter, Zap, Inbox,
} from 'lucide-react';
import type { DashboardStats } from './types';
import { createFilterLink } from './types';

interface MobileDashboardProps {
  stats: DashboardStats;
  analiseAtrasos: any;
  totalAtrasados: number;
  onRefresh: () => void;
}

export function MobileDashboard({ stats, analiseAtrasos, totalAtrasados, onRefresh }: MobileDashboardProps) {
  const hasData = stats.total > 0;

  return (
    <div className="md:hidden min-h-screen bg-gray-50">
      {/* Header */}
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
                  {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
            <button onClick={onRefresh} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors" title="Atualizar dados">
              <RefreshCw className="w-5 h-5 text-white" />
            </button>
          </div>

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
        {!hasData && (
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-700 mb-2">Sem dados cadastrados</h3>
            <p className="text-sm text-gray-500 mb-4">Cadastre a primeira pessoa para começar a usar o sistema.</p>
            <Link href="/dashboard/registrar" className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium">
              <UserPlus className="w-4 h-4" />Cadastrar Pessoa
            </Link>
          </div>
        )}

        {/* Ações Rápidas */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-gray-800">Ações Rápidas</h2>
          </div>
          <div className="space-y-3">
            <Link href="/dashboard/comparecimento/confirmar" className="block w-full bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl p-4 shadow-md active:scale-95 transition-transform">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center"><UserCheck className="w-6 h-6" /></div>
                  <div className="text-left"><p className="font-bold text-base">Confirmar Presença</p><p className="text-xs text-white/80">Registrar comparecimento</p></div>
                </div>
                <ChevronRight className="w-5 h-5" />
              </div>
            </Link>
            <Link href="/dashboard/geral" className="block w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-md active:scale-95 transition-transform">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center"><Users className="w-6 h-6" /></div>
                  <div className="text-left"><p className="font-bold text-base">Lista Completa</p><p className="text-xs text-white/80">Ver todos os custodiados</p></div>
                </div>
                <ChevronRight className="w-5 h-5" />
              </div>
            </Link>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Link href="/dashboard/registrar" className="bg-green-50 border-2 border-green-200 rounded-lg p-3 active:scale-95 transition-transform">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center"><UserPlus className="w-5 h-5 text-white" /></div>
                  <p className="text-xs font-semibold text-green-700">Cadastrar</p>
                </div>
              </Link>
              <Link href={createFilterLink({ urgencia: 'hoje' })} className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3 active:scale-95 transition-transform">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center"><Clock className="w-5 h-5 text-white" /></div>
                  <p className="text-xs font-semibold text-yellow-700">Hoje ({stats.comparecimentosHoje})</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Alerta de Atrasados */}
        {totalAtrasados > 0 && (
          <Link href={createFilterLink({ urgencia: 'atrasados' })} className="block bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 shadow-lg active:scale-95 transition-transform">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center"><AlertTriangle className="w-6 h-6" /></div>
                <div>
                  <p className="font-bold text-base">{totalAtrasados} em Atraso</p>
                  <p className="text-xs text-white/80">
                    {analiseAtrasos ? `Média de ${Math.round(analiseAtrasos.mediaDiasAtraso)} dias` : 'Toque para ver detalhes'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5" />
            </div>
          </Link>
        )}

        {/* Estatísticas */}
        {hasData && (
          <div className="bg-white rounded-xl shadow-lg p-4">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />Estatísticas</h2>
            <div className="space-y-3">
              <Link href={createFilterLink({ status: 'em conformidade' })} className="flex items-center justify-between p-3 bg-green-50 rounded-lg active:bg-green-100 transition-colors">
                <div className="flex items-center gap-3"><CheckCircle className="w-8 h-8 text-green-600" /><div><p className="font-semibold text-green-800">Em Conformidade</p><p className="text-xs text-green-600">{stats.percentualConformidade.toFixed(1)}% do total</p></div></div>
                <p className="text-2xl font-bold text-green-600">{stats.emConformidade}</p>
              </Link>
              <Link href={createFilterLink({ urgencia: 'proximos' })} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg active:bg-blue-100 transition-colors">
                <div className="flex items-center gap-3"><Calendar className="w-8 h-8 text-blue-600" /><div><p className="font-semibold text-blue-800">Próximos 7 Dias</p><p className="text-xs text-blue-600">Comparecimentos previstos</p></div></div>
                <p className="text-2xl font-bold text-blue-600">{stats.proximosPrazos}</p>
              </Link>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3"><TrendingUp className="w-8 h-8 text-purple-600" /><div><p className="font-semibold text-purple-800">Este Mês</p><p className="text-xs text-purple-600">Comparecimentos realizados</p></div></div>
                <p className="text-2xl font-bold text-purple-600">{stats.comparecimentosEsteMes}</p>
              </div>
            </div>
          </div>
        )}

        {/* Análise de Atrasos Mobile */}
        {analiseAtrasos && analiseAtrasos.totalCustodiadosAtrasados > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-4">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><UserX className="w-5 h-5 text-red-600" />Análise de Atrasos</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-red-50 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-red-600">{analiseAtrasos.totalCustodiadosAtrasados}</p><p className="text-xs text-red-600">Total Atrasados</p></div>
              <div className="bg-orange-50 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-orange-600">{Math.round(analiseAtrasos.mediaDiasAtraso)}</p><p className="text-xs text-orange-600">Média de Dias</p></div>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Até 30 dias', value: analiseAtrasos.totalAtrasados30Dias ?? 0, danger: false },
                { label: '31 a 60 dias', value: analiseAtrasos.totalAtrasados60Dias ?? 0, danger: false },
                { label: '61 a 90 dias', value: analiseAtrasos.totalAtrasados90Dias ?? 0, danger: false },
                { label: 'Mais de 90 dias', value: analiseAtrasos.totalAtrasadosMais90Dias ?? 0, danger: true },
              ].map(({ label, value, danger }) => (
                <div key={label} className={`flex justify-between items-center text-sm p-2 rounded ${danger ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <span className={danger ? 'font-semibold text-red-700' : 'text-gray-600'}>{label}</span>
                  <span className={`font-bold ${danger ? 'text-red-700' : ''}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outras Ações */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><ListFilter className="w-5 h-5 text-gray-600" />Outras Ações</h2>
          <div className="space-y-2">
            <Link href={createFilterLink({ status: 'inadimplente' })} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg active:bg-gray-100 transition-colors">
              <div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" /><span className="font-medium text-gray-700">Ver Inadimplentes</span></div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
            <Link href="/dashboard/configuracoes" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg active:bg-gray-100 transition-colors">
              <div className="flex items-center gap-2"><FileText className="w-5 h-5 text-gray-500" /><span className="font-medium text-gray-700">Configurações</span></div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 safe-area-bottom">
        <p className="text-center text-xs text-gray-500">
          Última atualização: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
