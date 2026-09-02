/* eslint-disable @typescript-eslint/no-unused-vars */
import { PessoaMonitoradaData, StatusComparecimento } from '@/types/api';
import type { ExportData, ExportStatistics, ExportFilterInfo } from '@/types/export';

/**
 * Calcula estatísticas dos dados para incluir no relatório
 */
export function calculateExportStatistics(dados: PessoaMonitoradaData[]): ExportStatistics {
    const hoje = new Date().toISOString().split('T')[0];

    const emConformidade = dados.filter(d => d.status === StatusComparecimento.EM_CONFORMIDADE).length;
    const inadimplentes = dados.filter(d => d.status === StatusComparecimento.INADIMPLENTE).length;

    const comparecimentosHoje = dados.filter(d => d.proximoComparecimento === hoje).length;

    const atrasados = dados.filter(d => {
        if (!d.proximoComparecimento) return false;
        const proximoComparecimento = new Date(d.proximoComparecimento);
        const hojeDate = new Date(hoje);
        return proximoComparecimento < hojeDate;
    }).length;

    const proximoPrazo = new Date();
    proximoPrazo.setDate(proximoPrazo.getDate() + 7);
    const proximoPrazoStr = proximoPrazo.toISOString().split('T')[0];

    const proximosPrazos = dados.filter(d => {
        if (!d.proximoComparecimento) return false;
        const dataComparecimento = typeof d.proximoComparecimento === 'string' 
            ? d.proximoComparecimento 
            : d.proximoComparecimento.toISOString().split('T')[0];
        return dataComparecimento >= hoje && dataComparecimento <= proximoPrazoStr;
    }).length;

    return {
        totalRegistros: dados.length,
        emConformidade,
        inadimplentes,
        comparecimentosHoje,
        atrasados,
        proximosPrazos
    };
}

/**
 * Gera nome de arquivo baseado nos filtros aplicados
 */
export function generateFilename(filterInfo?: ExportFilterInfo): string {
    const timestamp = new Date().toISOString().split('T')[0];
    let filename = 'comparecimentos';

    if (filterInfo) {
        const parts: string[] = [];

        if (filterInfo.status && filterInfo.status !== 'todos') {
            parts.push(filterInfo.status === 'em conformidade' ? 'conformes' : 'inadimplentes');
        }

        if (filterInfo.urgencia && filterInfo.urgencia !== 'todos') {
            const urgenciaMap = {
                'hoje': 'hoje',
                'atrasados': 'atrasados',
                'proximos': 'proximos7dias'
            };
            parts.push(urgenciaMap[filterInfo.urgencia as keyof typeof urgenciaMap]);
        }

        if (filterInfo.filtro) {
            parts.push('filtrados');
        }

        if (filterInfo.dataInicio && filterInfo.dataFim) {
            const inicio = filterInfo.dataInicio.replace(/-/g, '');
            const fim = filterInfo.dataFim.replace(/-/g, '');
            parts.push(`${inicio}_${fim}`);
        }

        if (parts.length > 0) {
            filename += `_${parts.join('_')}`;
        }
    }

    return `${filename}_${timestamp}.xlsx`;
}

/**
 * Valida dados antes da exportação
 */
export function validateExportData(dados: PessoaMonitoradaData[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!dados || dados.length === 0) {
        errors.push('Nenhum dado disponível para exportação');
    }

    // Verificar se há campos obrigatórios vazios
    const camposObrigatorios: (keyof PessoaMonitoradaData)[] = ['nome', 'processo', 'proximoComparecimento'];

    dados.forEach((item, index) => {
        camposObrigatorios.forEach(campo => {
            if (!item[campo] || String(item[campo]).trim() === '') {
                errors.push(`Linha ${index + 1}: Campo "${campo}" é obrigatório`);
            }
        });
    });

    // Verificar duplicatas de processo
    const processos = dados.map(d => d.processo).filter(Boolean);
    const processosDuplicados = processos.filter((processo, index) =>
        processos.indexOf(processo) !== index
    );

    if (processosDuplicados.length > 0) {
        errors.push(`Processos duplicados encontrados: ${[...new Set(processosDuplicados)].join(', ')}`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Transforma dados para formato de exportação com validação
 * Retorna PessoaMonitoradaData com campos calculados adicionados
 */
export function transformDataForExport(dados: PessoaMonitoradaData[]): ExportData[] {
    return dados.map((item) => {
        const hoje = new Date();
        
        // Proteção contra proximoComparecimento undefined
        if (!item.proximoComparecimento) {
            return {
                ...item,
                statusUrgencia: 'Sem data',
                diasAtraso: 0
            };
        }

        const proximoComparecimento = typeof item.proximoComparecimento === 'string'
            ? new Date(item.proximoComparecimento)
            : item.proximoComparecimento;
            
        const diffTime = proximoComparecimento.getTime() - hoje.getTime();
        const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const hojeStr = hoje.toISOString().split('T')[0];
        const proximoStr = typeof item.proximoComparecimento === 'string'
            ? item.proximoComparecimento
            : item.proximoComparecimento.toISOString().split('T')[0];
        
        const isHoje = proximoStr === hojeStr;
        const isAtrasado = diasRestantes < 0;

        let statusUrgencia = 'Normal';
        let diasAtraso = 0;

        if (isAtrasado) {
            statusUrgencia = 'Atrasado';
            diasAtraso = Math.abs(diasRestantes);
        } else if (isHoje) {
            statusUrgencia = 'Hoje';
        } else if (diasRestantes <= 7 && diasRestantes > 0) {
            statusUrgencia = 'Próximo (7 dias)';
        }

        return {
            ...item,
            statusUrgencia,
            diasAtraso
        };
    });
}

/**
 * Formata data para padrão brasileiro
 */
export function formatDateToBR(date?: string | Date): string {
    if (!date) return '';
    
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        // Verificar se é uma data válida
        if (isNaN(dateObj.getTime())) return '';
        
        return dateObj.toLocaleDateString('pt-BR');
    } catch (error) {
        return '';
    }
}

/**
 * Formata periodicidade para exibição
 */
export function formatPeriodicidade(periodicidade?: number): string {
    if (!periodicidade) return '';
    
    if (periodicidade === 30) return 'Mensal';
    if (periodicidade === 60) return 'Bimensal';
    if (periodicidade === 90) return 'Trimestral';
    if (periodicidade === 180) return 'Semestral';
    if (periodicidade === 365) return 'Anual';
    
    return `${periodicidade} dias`;
}

/**
 * Formata status para exibição
 */
export function formatStatus(status?: StatusComparecimento): string {
    if (!status) return '';
    
    // ✅ CORRETO - Comparar enum com enum
    return status === StatusComparecimento.EM_CONFORMIDADE 
        ? 'Em Conformidade' 
        : 'Inadimplente';
}

/**
 * Gera resumo textual dos filtros aplicados
 */
export function generateFilterSummary(filterInfo?: ExportFilterInfo): string {
    if (!filterInfo) return 'Nenhum filtro aplicado';

    const filtros: string[] = [];

    if (filterInfo.filtro) {
        filtros.push(`Busca: "${filterInfo.filtro}"`);
    }

    if (filterInfo.status && filterInfo.status !== 'todos') {
        const statusLabel = filterInfo.status === 'em conformidade' ? 'Em Conformidade' : 'Inadimplente';
        filtros.push(`Status: ${statusLabel}`);
    }

    if (filterInfo.urgencia && filterInfo.urgencia !== 'todos') {
        const urgenciaLabels = {
            'hoje': 'Comparecimentos de Hoje',
            'atrasados': 'Em Atraso',
            'proximos': 'Próximos 7 dias'
        };
        filtros.push(`Urgência: ${urgenciaLabels[filterInfo.urgencia as keyof typeof urgenciaLabels]}`);
    }

    if (filterInfo.dataInicio && filterInfo.dataFim) {
        const inicio = formatDateToBR(filterInfo.dataInicio);
        const fim = formatDateToBR(filterInfo.dataFim);
        filtros.push(`Período: ${inicio} até ${fim}`);
    }

    return filtros.length > 0 ? filtros.join('; ') : 'Nenhum filtro aplicado';
}

/**
 * Calcula progresso de exportação (para futuras implementações com grandes volumes)
 */
export function calculateExportProgress(processedItems: number, totalItems: number): number {
    if (totalItems === 0) return 100;
    return Math.round((processedItems / totalItems) * 100);
}

/**
 * Estima tempo de exportação baseado no volume de dados
 */
export function estimateExportTime(dataLength: number): string {
    // Estimativa grosseira: ~1000 registros por segundo
    const estimatedSeconds = Math.ceil(dataLength / 1000);

    if (estimatedSeconds < 1) return 'menos de 1 segundo';
    if (estimatedSeconds < 60) return `${estimatedSeconds} segundos`;

    const minutes = Math.ceil(estimatedSeconds / 60);
    return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
}

/**
 * Limpa e normaliza dados antes da exportação
 */
export function sanitizeExportData(dados: PessoaMonitoradaData[]): PessoaMonitoradaData[] {
    return dados.map(item => ({
        ...item,
        nome: String(item.nome || '').trim(),
        cpf: String(item.cpf || '').trim(),
        rg: String(item.rg || '').trim(),
        contato: String(item.contato || '').trim(),
        processo: String(item.processo || '').trim(),
        vara: String(item.vara || '').trim(),
        comarca: String(item.comarca || '').trim()
    }));
}

/**
 * Agrupa dados por status para análise
 */
export function groupByStatus(dados: PessoaMonitoradaData[]): Record<string, PessoaMonitoradaData[]> {
    return dados.reduce((acc, item) => {
        const status = item.status || 'sem_status';
        if (!acc[status]) {
            acc[status] = [];
        }
        acc[status].push(item);
        return acc;
    }, {} as Record<string, PessoaMonitoradaData[]>);
}

/**
 * Agrupa dados por urgência
 */
export function groupByUrgency(dados: ExportData[]): Record<string, ExportData[]> {
    return dados.reduce((acc, item) => {
        const urgencia = item.statusUrgencia || 'normal';
        if (!acc[urgencia]) {
            acc[urgencia] = [];
        }
        acc[urgencia].push(item);
        return acc;
    }, {} as Record<string, ExportData[]>);
}

/**
 * Ordena dados por próximo comparecimento
 */
export function sortByProximoComparecimento(dados: PessoaMonitoradaData[]): PessoaMonitoradaData[] {
    return [...dados].sort((a, b) => {
        if (!a.proximoComparecimento) return 1;
        if (!b.proximoComparecimento) return -1;
        
        const dateA = typeof a.proximoComparecimento === 'string' 
            ? new Date(a.proximoComparecimento) 
            : a.proximoComparecimento;
        const dateB = typeof b.proximoComparecimento === 'string' 
            ? new Date(b.proximoComparecimento) 
            : b.proximoComparecimento;
        
        return dateA.getTime() - dateB.getTime();
    });
}

/**
 * Filtra dados por período
 */
export function filterByPeriod(
    dados: PessoaMonitoradaData[], 
    dataInicio: string, 
    dataFim: string
): PessoaMonitoradaData[] {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    
    return dados.filter(item => {
        if (!item.proximoComparecimento) return false;
        
        const data = typeof item.proximoComparecimento === 'string'
            ? new Date(item.proximoComparecimento)
            : item.proximoComparecimento;
        
        return data >= inicio && data <= fim;
    });
}