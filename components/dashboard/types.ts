export interface DashboardStats {
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

export interface TendenciaData {
  mes: string;
  mesNome: string;
  conformidade: number;
  inadimplencia: number;
  comparecimentos: number;
}

export const EMPTY_STATS: DashboardStats = {
  total: 0,
  emConformidade: 0,
  inadimplentes: 0,
  proximosPrazos: 0,
  comparecimentosHoje: 0,
  atrasados: 0,
  percentualConformidade: 0,
  percentualInadimplencia: 0,
  totalComparecimentos: 0,
  comparecimentosEsteMes: 0,
};

export function createFilterLink(params: Record<string, string>): string {
  const searchParams = new URLSearchParams(params);
  return `/dashboard/geral?${searchParams.toString()}`;
}
