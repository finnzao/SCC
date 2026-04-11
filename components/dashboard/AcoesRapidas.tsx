import Link from 'next/link';
import { Users, UserCheck, Clock, Search, FileText, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { createFilterLink } from './types';

interface AcoesRapidasProps {
  comparecimentosHoje: number;
}

export function AcoesRapidas({ comparecimentosHoje }: AcoesRapidasProps) {
  return (
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
            Comparecimentos de Hoje ({comparecimentosHoje})
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
  );
}
