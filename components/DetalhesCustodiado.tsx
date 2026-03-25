/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { X, UserCheck, Edit, FileText, AlertTriangle, Loader2, Trash2, MapPin, Phone, Calendar, Hash, Clock, CheckCircle, History } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Comparecimento } from '@/types';
import { custodiadosService } from '@/lib/api/services';
import { STATUS_LABELS, STATUS_COLORS } from '@/constants/status';
import ConfirmDialog from '@/components/ConfirmDialog';
import { 
  FormattingCPF as formatCPF,
  FormattingRG as formatRG,
  FormattingPhone as formatContato,
  FormattingCEP as formatCEP
} from '@/lib/utils/formatting';


const dateUtils = {
  parseLocalDate: (dateString: string): Date => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  },

  formatToBR: (date: string | Date | null | undefined): string => {
    if (!date) return 'Não informado';
    
    const dateObj = typeof date === 'string' ? dateUtils.parseLocalDate(date) : date;
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `${day}/${month}/${year}`;
  },

  getCurrentDate: (): string => {
    const hoje = new Date();
    const year = hoje.getFullYear();
    const month = String(hoje.getMonth() + 1).padStart(2, '0');
    const day = String(hoje.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  getDaysUntil: (dateString: string): number => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const targetDate = dateUtils.parseLocalDate(dateString);
    targetDate.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate.getTime() - hoje.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  isToday: (dateString: string): boolean => {
    return dateString === dateUtils.getCurrentDate();
  },

  isOverdue: (dateString: string): boolean => {
    return dateUtils.getDaysUntil(dateString) < 0;
  }
};

interface Props {
  dados: Comparecimento;
  onClose: () => void;
  onEditar: (dados: Comparecimento) => void;
  onExcluir?: (id: string | number) => void;
}

type StatusKey = keyof typeof STATUS_COLORS;

const getStatusKey = (status: string | undefined): StatusKey => {
  const normalizedStatus = status?.toLowerCase() || 'inadimplente';

  if (normalizedStatus in STATUS_COLORS) {
    return normalizedStatus as StatusKey;
  }

  const uppercaseStatus = status?.toUpperCase();
  if (uppercaseStatus && uppercaseStatus in STATUS_COLORS) {
    return uppercaseStatus as StatusKey;
  }

  return 'inadimplente';
};

function resolveId(id: string | number | undefined): string | number {
  if (id === undefined || id === null) return 0;
  return id;
}

export default function DetalhesCustodiadoModal({ dados, onClose, onEditar, onExcluir }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [dadosCompletos, setDadosCompletos] = useState<Comparecimento>(dados);

  useEffect(() => {
    const carregarDadosCompletos = async () => {
      if (!dados.id) return;
      
      setLoadingDetails(true);
      try {
        const rawId = resolveId(dados.id as any);
        const response = await custodiadosService.buscarPorId(rawId as any);
        
        if (response && response.data) {
          const custodiado = response.data;
          setDadosCompletos({
            ...dados,
            ...custodiado,
            endereco: custodiado.endereco || dados.endereco,
            status: custodiado.status || dados.status
          } as any);
        }
      } catch (error) {
        console.error('Erro ao buscar dados completos:', error);
        setDadosCompletos(dados);
      } finally {
        setLoadingDetails(false);
      }
    };
    
    carregarDadosCompletos();
  }, [dados]);

  const handleConfirmarPresenca = () => {
    router.push(`/dashboard/comparecimento/confirmar?processo=${encodeURIComponent(String(dadosCompletos.processo))}`);
  };

  const handleEditarClick = () => {
    onEditar(dadosCompletos);
  };

  const handleVerHistoricoEnderecos = () => {
    const rawId = resolveId(dadosCompletos.id as any);
    router.push(`/dashboard/historicoComparecimento/enderecos/${rawId}`);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const rawId = resolveId(dadosCompletos.id as any);
      
      if (!rawId) {
        throw new Error('ID do custodiado inválido');
      }

      const resultado = await custodiadosService.excluir(rawId as any);
      
      if (resultado.success) {
        if (onExcluir) {
          onExcluir(rawId);
        }
        
        setTimeout(() => {
          onClose();
        }, 500);
        
      } else {
        throw new Error(resultado.message || 'Erro ao excluir registro');
      }
      
    } catch (error) {
      console.error('Erro ao excluir:', error);
      
      let errorMessage = 'Erro ao excluir registro';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setDeleteError(errorMessage);
      setTimeout(() => setDeleteError(null), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatarPeriodicidade = (periodicidade: number | string): string => {
    if (typeof periodicidade === 'number') {
      return `${periodicidade} dias`;
    }
    return periodicidade === 'mensal' ? 'Mensal (30 dias)' : 'Bimensal (60 dias)';
  };

  const statusKey = getStatusKey(dadosCompletos.status);
  const isComparecimentoHoje = dateUtils.isToday(dadosCompletos.proximoComparecimento);
  const isComparecimentoAtrasado = dateUtils.isOverdue(dadosCompletos.proximoComparecimento);
  const diasRestantes = dateUtils.getDaysUntil(dadosCompletos.proximoComparecimento);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="relative bg-white p-6 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <div>
            <h3 className="text-2xl font-bold text-primary-dark">Detalhes do Custodiado</h3>
            <p className="text-text-muted mt-1">Informações completas do registro</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isDeleting}
          >
            <X size={24} />
          </button>
        </div>

        {loadingDetails && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <p className="text-sm text-blue-700">Carregando dados completos...</p>
            </div>
          </div>
        )}

        {deleteError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700">{deleteError}</p>
            </div>
          </div>
        )}

        <div className={`rounded-lg p-4 mb-6 ${STATUS_COLORS[statusKey]}`}>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Dados Pessoais
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="md:col-span-2">
              <span className="font-medium">Nome Completo:</span>
              <p className="mt-1 text-lg font-semibold">{dadosCompletos.nome}</p>
            </div>
            <div>
              <span className="font-medium">CPF:</span>
              <p className="mt-1 font-mono">
                {dadosCompletos.cpf ? formatCPF(String(dadosCompletos.cpf)) : 'Não informado'}
              </p>
            </div>
            <div>
              <span className="font-medium">RG:</span>
              <p className="mt-1 font-mono">
                {dadosCompletos.rg ? formatRG(String(dadosCompletos.rg)) : 'Não informado'}
              </p>
            </div>
            <div>
              <span className="font-medium flex items-center gap-1">
                <Phone className="w-3 h-3" />
                Telefone:
              </span>
              <p className="mt-1 font-mono">
                {dadosCompletos.contato ? formatContato(String(dadosCompletos.contato)) : 'Não informado'}
              </p>
            </div>
            <div>
              <span className="font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Status:
              </span>
              <p className="mt-1 font-semibold uppercase">{STATUS_LABELS[statusKey]}</p>
            </div>
          </div>
        </div>

        {dadosCompletos.endereco && (
          <div className="bg-green-50 rounded-lg p-4 mb-6 relative">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-semibold text-green-800 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Endereço Atual
              </h4>
              <button
                onClick={handleVerHistoricoEnderecos}
                className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1 transition-colors"
              >
                <History className="w-3 h-3" />
                Ver histórico
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-green-700">CEP:</span>
                <p className="text-green-600">{formatCEP(dadosCompletos.endereco.cep)}</p>
              </div>
              
              <div>
                <span className="font-medium text-green-700">Logradouro:</span>
                <p className="text-green-600">
                  {dadosCompletos.endereco.logradouro}, {dadosCompletos.endereco.numero}
                  {dadosCompletos.endereco.complemento && ` - ${dadosCompletos.endereco.complemento}`}
                </p>
              </div>
              
              <div>
                <span className="font-medium text-green-700">Bairro:</span>
                <p className="text-green-600">{dadosCompletos.endereco.bairro}</p>
              </div>
              
              <div>
                <span className="font-medium text-green-700">Cidade:</span>
                <p className="text-green-600">{dadosCompletos.endereco.cidade}</p>
              </div>
              
              <div>
                <span className="font-medium text-green-700">Estado:</span>
                <p className="text-green-600">
                  {dadosCompletos.endereco.nomeEstado || dadosCompletos.endereco.estado}
                  {dadosCompletos.endereco.regiaoEstado && ` (${dadosCompletos.endereco.regiaoEstado})`}
                </p>
              </div>

              {dadosCompletos.endereco.diasResidencia !== undefined && (
                <div>
                  <span className="font-medium text-green-700 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Tempo de Residência:
                  </span>
                  <p className="text-green-600">{dadosCompletos.endereco.diasResidencia} dias</p>
                </div>
              )}
              
              {dadosCompletos.endereco.dataInicio && (
                <div>
                  <span className="font-medium text-green-700">Residente desde:</span>
                  <p className="text-green-600">{dateUtils.formatToBR(dadosCompletos.endereco.dataInicio)}</p>
                </div>
              )}
              
              {dadosCompletos.endereco.validadoPor && (
                <div>
                  <span className="font-medium text-green-700">Validado por:</span>
                  <p className="text-green-600">{dadosCompletos.endereco.validadoPor}</p>
                </div>
              )}
            </div>

            {dadosCompletos.endereco.motivoAlteracao && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <span className="font-medium text-green-700 text-sm">Motivo do cadastro/alteração:</span>
                <p className="text-green-600 text-sm mt-1 italic">
                  {dadosCompletos.endereco.motivoAlteracao}
                </p>
              </div>
            )}
          </div>
        )}

        {!dadosCompletos.endereco && (
          <div className="bg-yellow-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <p className="text-yellow-700 font-medium">Endereço não cadastrado</p>
            </div>
          </div>
        )}

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Dados Processuais
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="md:col-span-2">
              <span className="font-medium text-blue-700">Processo:</span>
              <p className="text-blue-600 mt-1 font-mono">{dadosCompletos.processo}</p>
            </div>
            <div>
              <span className="font-medium text-blue-700">Vara:</span>
              <p className="text-blue-600 mt-1">{dadosCompletos.vara}</p>
            </div>
            <div>
              <span className="font-medium text-blue-700">Comarca:</span>
              <p className="text-blue-600 mt-1">{dadosCompletos.comarca}</p>
            </div>
            <div>
              <span className="font-medium text-blue-700">Data da Decisão:</span>
              <p className="text-blue-600 mt-1">{dateUtils.formatToBR(dadosCompletos.dataDecisao)}</p>
            </div>
            <div>
              <span className="font-medium text-blue-700 flex items-center gap-1">
                <Hash className="w-4 h-4" />
                Periodicidade:
              </span>
              <p className="text-blue-600 mt-1 capitalize">
                {formatarPeriodicidade(dadosCompletos.periodicidade)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Histórico de Comparecimentos
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="font-medium text-yellow-700">Primeiro Comparecimento:</span>
              <p className="text-yellow-600 mt-1">{dateUtils.formatToBR(dadosCompletos.dataComparecimentoInicial)}</p>
            </div>
            <div>
              <span className="font-medium text-yellow-700">Último Comparecimento:</span>
              <p className="text-yellow-600 mt-1">{dateUtils.formatToBR(dadosCompletos.ultimoComparecimento)}</p>
            </div>
            <div>
              <span className="font-medium text-yellow-700">Próximo Comparecimento:</span>
              <p className={`mt-1 font-medium ${
                isComparecimentoAtrasado ? 'text-red-600' : 
                isComparecimentoHoje ? 'text-yellow-600' : 
                'text-yellow-600'
              }`}>
                {dateUtils.formatToBR(dadosCompletos.proximoComparecimento)}
              </p>
              {!isComparecimentoAtrasado && !isComparecimentoHoje && (
                <p className="text-yellow-500 text-xs mt-1">
                  Em {diasRestantes} dias
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 justify-center pt-4 border-t border-gray-200">
          <button 
            onClick={handleConfirmarPresenca}
            disabled={isDeleting}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg ${
              isComparecimentoHoje || isComparecimentoAtrasado
                ? 'bg-green-500 text-white hover:bg-green-600 animate-pulse'
                : 'bg-secondary text-white hover:bg-green-600'
            } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <UserCheck className="w-5 h-5" />
            Validar Comparecimento
          </button>

          <button
            onClick={handleEditarClick}
            disabled={isDeleting || loadingDetails}
            className={`flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark font-medium transition-all ${
              isDeleting || loadingDetails ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Edit className="w-5 h-5" />
            Editar Dados
          </button>

          <button 
            onClick={() => setShowConfirmDialog(true)}
            disabled={isDeleting}
            className={`flex items-center gap-2 bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 font-medium transition-all ${
              isDeleting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="w-5 h-5" />
                Excluir
              </>
            )}
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            Registro atualizado em: {dateUtils.formatToBR((dadosCompletos as any).atualizadoEm) || new Date().toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmDelete}
        type="danger"
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o registro de ${dadosCompletos.nome}?`}
        details={[
          `Processo: ${dadosCompletos.processo}`,
          `CPF: ${dadosCompletos.cpf ? formatCPF(String(dadosCompletos.cpf)) : 'Não informado'}`,
          `Status: ${STATUS_LABELS[statusKey]}`,
          'Esta ação não pode ser desfeita!'
        ]}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
      />
    </div>
  );
}
