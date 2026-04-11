'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Inbox } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface StatusPieChartProps {
  emConformidade: number;
  inadimplentes: number;
}

const COLORS = { conformidade: '#7ED6A7', inadimplente: '#E57373' };

export function StatusPieChart({ emConformidade, inadimplentes }: StatusPieChartProps) {
  const data = [
    { name: 'Em Conformidade', value: emConformidade, color: COLORS.conformidade },
    { name: 'Inadimplentes', value: inadimplentes, color: COLORS.inadimplente },
  ];

  const hasData = data.some(d => d.value > 0);

  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold text-primary-dark mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5" />
        Distribuição de Status
      </h3>

      {hasData ? (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-4 flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-sm">Em Conformidade ({emConformidade})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span className="text-sm">Inadimplentes ({inadimplentes})</span>
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
  );
}
