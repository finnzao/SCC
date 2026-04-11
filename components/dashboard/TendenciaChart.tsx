/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { History, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { TendenciaData } from './types';

interface TendenciaChartProps {
  tendencia: TendenciaData[];
  relatorio: any;
}

export function TendenciaChart({ tendencia, relatorio }: TendenciaChartProps) {
  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold text-primary-dark mb-4 flex items-center gap-2">
        <History className="w-5 h-5" />
        Análise de Comparecimentos - Últimos 6 Meses
      </h3>

      {relatorio ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600">Total de Comparecimentos</p>
            <p className="text-3xl font-bold text-blue-800">{relatorio.totalComparecimentos ?? 0}</p>
            <p className="text-xs text-blue-500 mt-1">
              Média: {(relatorio.mediaComparecimentosMensal ?? 0).toFixed(1)}/mês
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600">Comparecimentos Presenciais</p>
            <p className="text-3xl font-bold text-green-800">{relatorio.comparecimentosPresenciais ?? 0}</p>
            <p className="text-xs text-green-500 mt-1">{(relatorio.percentualPresencial ?? 0).toFixed(1)}% do total</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-purple-600">Mudanças de Endereço</p>
            <p className="text-3xl font-bold text-purple-800">{relatorio.mudancasEndereco ?? 0}</p>
            <p className="text-xs text-purple-500 mt-1">No período analisado</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500 text-sm mb-4">
          Dados do relatório mensal não disponíveis
        </div>
      )}

      {tendencia.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={tendencia}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mesNome" />
            <YAxis />
            <Tooltip formatter={(value, name) => [
              typeof value === 'number' ? value.toFixed(1) + '%' : value,
              name
            ]} />
            <Legend />
            <Line type="monotone" dataKey="conformidade" stroke="#7ED6A7" strokeWidth={3} name="Conformidade (%)" />
            <Line type="monotone" dataKey="inadimplencia" stroke="#E57373" strokeWidth={3} name="Inadimplência (%)" />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <TrendingUp className="w-12 h-12 mb-3" />
          <p className="text-gray-500 font-medium">Sem dados de tendência</p>
          <p className="text-sm text-gray-400 mt-1">Os dados aparecerão conforme os comparecimentos forem registrados</p>
        </div>
      )}
    </Card>
  );
}
