import Link from 'next/link';
import { Users, CheckCircle, AlertTriangle, Calendar, ArrowRight, Gavel, Scale, UserX } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { DashboardStats } from './types';
import { createFilterLink } from './types';

interface StatsCardsProps {
  stats: DashboardStats;
  mediaDiasAtraso: number | null;
}

export function StatsCards({ stats, mediaDiasAtraso }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <Link href="/dashboard/geral">
        <Card className="p-6 border-l-4 border-l-primary hover:shadow-lg transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-sm font-medium">Total de Pessoas Monitoradas</p>
              <p className="text-3xl font-bold text-primary-dark">{stats.total}</p>
              <p className="text-sm text-text-muted mt-1">
                {stats.cautelares} cautelar · {stats.execucoes} execução
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

      {/* conceito unico: inadimplente = passou da data (o antigo card "Atrasados" era duplicado) */}
      <Link href={createFilterLink({ status: 'inadimplente' })}>
        <Card className="p-6 border-l-4 border-l-danger hover:shadow-lg transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-sm font-medium">Inadimplentes</p>
              <p className="text-3xl font-bold text-danger">{stats.inadimplentes}</p>
              <p className="text-sm text-danger font-medium">
                {stats.percentualInadimplencia.toFixed(1)}% do total
                {mediaDiasAtraso !== null && mediaDiasAtraso > 0 ? ` · média ${mediaDiasAtraso} dias` : ''}
              </p>
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

      {stats.foragidos > 0 && (
        <Card className="p-6 border-l-4 border-l-gray-800 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-sm font-medium">Foragidos</p>
              <p className="text-3xl font-bold text-gray-800">{stats.foragidos}</p>
              <p className="text-sm text-text-muted">fora dos contadores de atraso</p>
            </div>
            <UserX className="w-12 h-12 text-gray-700 opacity-80" />
          </div>
        </Card>
      )}

      {/* Cards de execução penal — só quando a vara tem execuções cadastradas */}
      {stats.execucoes > 0 && (
        <>
          <Link href="/dashboard/execucoes">
            <Card className="p-6 border-l-4 border-l-red-600 hover:shadow-lg transition-all cursor-pointer group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-muted text-sm font-medium">Próximas Extinções</p>
                  <p className="text-3xl font-bold text-red-600">{stats.proximasExtincao}</p>
                  <p className="text-sm text-text-muted">término em até 60 dias</p>
                </div>
                <div className="flex items-center">
                  <Gavel className="w-12 h-12 text-red-600 opacity-80" />
                  <ArrowRight className="w-4 h-4 text-red-600 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/dashboard/execucoes">
            <Card className="p-6 border-l-4 border-l-amber-500 hover:shadow-lg transition-all cursor-pointer group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-muted text-sm font-medium">Aguardando Justificação</p>
                  <p className="text-3xl font-bold text-amber-600">{stats.aguardandoJustificacao}</p>
                  <p className="text-sm text-text-muted">pendente de decisão</p>
                </div>
                <div className="flex items-center">
                  <Scale className="w-12 h-12 text-amber-500 opacity-80" />
                  <ArrowRight className="w-4 h-4 text-amber-500 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Card>
          </Link>
        </>
      )}
    </div>
  );
}
