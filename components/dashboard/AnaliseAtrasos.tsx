/* eslint-disable @typescript-eslint/no-explicit-any */
import { CheckCircle, UserX } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface AnaliseAtrasosProps {
  analise: any;
}

export function AnaliseAtrasos({ analise }: AnaliseAtrasosProps) {
  const temAtrasos = analise && analise.totalCustodiadosAtrasados > 0;

  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold text-primary-dark mb-4 flex items-center gap-2">
        <UserX className="w-5 h-5" />
        Análise de Atrasos
      </h3>

      {temAtrasos ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-sm text-red-600">Total em Atraso</p>
              <p className="text-2xl font-bold text-red-800">{analise.totalCustodiadosAtrasados}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-sm text-orange-600">Média de Dias</p>
              <p className="text-2xl font-bold text-orange-800">{Math.round(analise.mediaDiasAtraso)}</p>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { label: 'Até 30 dias', value: analise.totalAtrasados30Dias ?? 0, danger: false },
              { label: '31 a 60 dias', value: analise.totalAtrasados60Dias ?? 0, danger: false },
              { label: '61 a 90 dias', value: analise.totalAtrasados90Dias ?? 0, danger: false },
              { label: 'Mais de 90 dias', value: analise.totalAtrasadosMais90Dias ?? 0, danger: true },
            ].map(({ label, value, danger }) => (
              <div key={label} className={`flex justify-between items-center p-2 rounded ${danger ? 'bg-red-50' : 'bg-gray-50'}`}>
                <span className={`text-sm ${danger ? 'font-medium text-red-700' : ''}`}>{label}</span>
                <span className={`font-${danger ? 'bold' : 'semibold'} ${danger ? 'text-red-700' : ''}`}>{value}</span>
              </div>
            ))}
          </div>

          {analise.custodiadoMaiorAtraso && (
            <div className="mt-4 p-3 bg-red-100 rounded-lg">
              <p className="text-sm font-medium text-red-800 mb-1">Maior Atraso</p>
              <p className="text-sm text-red-700">{analise.custodiadoMaiorAtraso.nome}</p>
              <p className="text-xs text-red-600">{analise.custodiadoMaiorAtraso.diasAtraso} dias de atraso</p>
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
  );
}
