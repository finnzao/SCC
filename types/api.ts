/* eslint-disable @typescript-eslint/no-explicit-any */

// Enums

export enum StatusComparecimento {
  EM_CONFORMIDADE = 'EM_CONFORMIDADE',
  INADIMPLENTE = 'INADIMPLENTE'
}



export enum TipoValidacao {
  PRESENCIAL = 'PRESENCIAL',
  ONLINE = 'ONLINE',
  CADASTRO_INICIAL = 'CADASTRO_INICIAL'
}

export enum TipoUsuario {
  ADMIN = 'ADMIN',
  USUARIO = 'USUARIO'
}

export enum StatusConvite {
  PENDENTE = 'PENDENTE',
  ATIVADO = 'ATIVADO',
  EXPIRADO = 'EXPIRADO',
  CANCELADO = 'CANCELADO',
  AGUARDANDO_VERIFICACAO = 'AGUARDANDO_VERIFICACAO'
}

export enum SituacaoCustodiado {
  ATIVO = 'ATIVO',
  ARQUIVADO = 'ARQUIVADO'
}

export enum EstadoBrasil {
  AC = 'AC', AL = 'AL', AP = 'AP', AM = 'AM', BA = 'BA',
  CE = 'CE', DF = 'DF', ES = 'ES', GO = 'GO', MA = 'MA',
  MT = 'MT', MS = 'MS', MG = 'MG', PA = 'PA', PB = 'PB',
  PR = 'PR', PE = 'PE', PI = 'PI', RJ = 'RJ', RN = 'RN',
  RS = 'RS', RO = 'RO', RR = 'RR', SC = 'SC', SP = 'SP',
  SE = 'SE', TO = 'TO'
}

// DTOs - Data Transfer Objects (Corrigidos conforme backend)

export interface EnderecoDTO {
  cep: string;
  logradouro: string;
  numero?: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
}

// CustodiadoDTO para criação (sem ID)
export interface CustodiadoCreateDTO {
  nome: string;
  cpf?: string;
  rg?: string;
  contato: string;
  processo: string;
  vara: string;
  comarca: string;
  dataDecisao: string;
  periodicidade: number;
  dataComparecimentoInicial: string;
  observacoes?: string;
  cep: string;
  logradouro: string;
  numero?: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
}

// CustodiadoDTO completo (com ID e campos adicionais)
export interface CustodiadoDTO {
  id?: number;
  nome: string;
  cpf?: string;
  rg?: string;
  contato: string;
  processo: string;
  vara: string;
  comarca: string;
  dataDecisao: string;
  periodicidade: number;
  dataComparecimentoInicial?: string;
  status?: StatusComparecimento;
  ultimoComparecimento?: string;
  proximoComparecimento?: string | Date;
  observacoes?: string;
  cep: string;
  logradouro: string;
  numero?: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface CustodiadoData extends CustodiadoDTO {
  id?: number;
  periodicidadeDescricao?: string;
  status?: StatusComparecimento;
  ultimoComparecimento?: string;
  proximoComparecimento?: string | Date;
  diasAtraso?: number;
  endereco?: EnderecoDTO;
  criadoEm: string;
  atualizadoEm: string | null;
  identificacao?: string;
  inadimplente?: boolean;
  comparecimentoHoje?: boolean;
  atrasado?: boolean;
  enderecoCompleto?: string;
  urgente?:boolean;
  cidadeEstado?: string;
}

// CustodiadoListDTO para listagens simplificadas
export interface CustodiadoListDTO {
  id: number;
  nome: string;
  cpf?: string;
  processo: string;
  comarca: string;
  status: StatusComparecimento;
  situacao: SituacaoCustodiado;
  proximoComparecimento?: string;
  diasAtraso?: number;
  enderecoResumido?: string;
  inadimplente: boolean;
  comparecimentoHoje: boolean;
}

export interface ComparecimentoDTO {
  processoId?: number;
  custodiadoId: number;
  dataComparecimento: string;
  horaComparecimento?: string;
  tipoValidacao: TipoValidacao;
  observacoes?: string;
  validadoPor: string;
  anexos?: string;
  mudancaEndereco?: boolean;
  motivoMudancaEndereco?: string;
  novoEndereco?: EnderecoDTO;
}

export interface HistoricoEnderecoDTO {
  id?: number;
  pessoaId: number;
  cep: string;
  logradouro: string;
  numero?: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  dataInicio: string;
  dataFim?: string;
  motivoAlteracao?: string;
  validadoPor?: string;
  historicoComparecimentoId?: number;
  criadoEm?: string;
  atualizadoEm?: string;
  version?: number;
  enderecoCompleto?: string;
  enderecoResumido?: string;
  nomeEstado?: string;
  regiaoEstado?: string;
  periodoResidencia?: string;
  diasResidencia?: number;
  enderecoAtivo?: boolean;
}

export interface UsuarioDTO {
  id?: number;
  nome: string;
  email: string;
  senha?: string;
  tipo: TipoUsuario;
  departamento?: string;
  comarca?: string;
  cargo?: string;
  ativo?: boolean;
  avatar?: string;
}

export interface AtualizarUsuarioDTO {
  nome?: string;
  email?: string;
  senha?: string;
  tipo?: TipoUsuario;
  departamento?: string;
  comarca?: string;
  cargo?: string;
  ativo?: boolean;
  avatar?: string;
}

export interface AtualizarPerfilDTO {
  nome: string;
  departamento?: string;
  comarca?: string;
  cargo?: string;
  avatar?: string;
}

export interface AlterarSenhaDTO {
  senhaAtual: string;
  novaSenha: string;
  confirmarSenha: string;
}

export interface SetupAdminDTO {
  nome: string;
  email: string;
  senha: string;
  confirmaSenha: string;
  departamento?: string;
  telefone?: string;
}

// Auth DTOs - Baseados nas classes internas do AuthDTO.java
export interface LoginRequestDTO {
  email: string;
  senha: string;
  mfaCode?: string;
  rememberMe?: boolean;
  forceLogin?: boolean;
  deviceInfo?: Record<string, string>;
}

export interface LoginResponseDTO {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn?: number;
  sessionId?: string;
  usuario?: UsuarioAuthDTO;
  requiresMfa?: boolean;
  requiresPasswordChange?: boolean;
  permissions?: string[];
  loginTime?: string;
}

export interface UsuarioAuthDTO {
  id: number;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  departamento?: string;
  comarca?: string;
  cargo?: string;
  avatar?: string;
  ultimoLogin?: string;
  mfaEnabled?: boolean;
  roles?: string[];
  preferences?: Record<string, any>;
}

export interface RefreshTokenRequestDTO {
  refreshToken: string;
}

export interface RefreshTokenResponseDTO {
  success: boolean;
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn?: number;
}

export interface TokenValidationResponseDTO {
  valid: boolean;
  email?: string;
  expiration?: string;
  authorities?: string[];
  message?: string;
  claims?: Record<string, any>;
}

export interface PasswordResetRequestDTO {
  email: string;
  recaptchaToken?: string;
}

export interface PasswordResetConfirmDTO {
  token: string;
  novaSenha: string;
  confirmaSenha: string;
}

export interface ChangePasswordDTO {
  senhaAtual: string;
  novaSenha: string;
  confirmaSenha: string;
}

export interface LogoutRequestDTO {
  refreshToken?: string;
  logoutAllDevices?: boolean;
}

export interface SessionInfoDTO {
  sessionId: string;
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
  loginTime?: string;
  lastActivity?: string;
  expiresAt?: string;
  current?: boolean;
  device?: string;
  location?: string;
}

export interface MfaSetupDTO {
  enable: boolean;
  secret?: string;
  qrCodeUrl?: string;
  backupCodes?: string[];
}

export interface MfaVerificationDTO {
  code: string;
  trustDevice?: boolean;
}

export interface AuthErrorDTO {
  error: string;
  errorDescription?: string;
  errorCode?: string;
  timestamp?: string;
  path?: string;
  remainingAttempts?: number;
  lockedUntil?: string;
}

export interface LoginAuditDTO {
  id?: number;
  email: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
  attemptTime?: string;
  location?: string;
  device?: string;
}

export interface PasswordPolicyDTO {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expirationDays?: number;
  historyCount?: number;
  requireChangeOnFirstLogin?: boolean;
}

export interface PasswordStrengthDTO {
  password: string;
  score?: number;
  strength?: string;
  suggestions?: string[];
  meetsPolicy?: boolean;
  requirements?: Record<string, boolean>;
}

// Email Verification DTOs
export interface SolicitarCodigoDTO {
  email: string;
  tipoUsuario: string;
}

export interface VerificarCodigoDTO {
  email: string;
  codigo: string;
}

export interface ReenviarCodigoDTO {
  email: string;
}

export interface SolicitarCodigoResponseDTO {
  status: string;
  message: string;
  email: string;
  validadePorMinutos?: number;
  tentativasPermitidas?: number;
  proximoEnvioEm?: string;
  codigoId?: string;
}

export interface VerificarCodigoResponseDTO {
  status: string;
  message: string;
  email: string;
  verificado?: boolean;
  tokenVerificacao?: string;
  tentativasRestantes?: number;
  validoAte?: string;
}

export interface StatusVerificacaoDTO {
  email: string;
  possuiCodigoAtivo?: boolean;
  verificado?: boolean;
  tentativasRestantes?: number;
  minutosRestantes?: number;
  ultimaVerificacao?: string;
  podeReenviar?: boolean;
}

// Convite DTOs - Baseados nas classes internas do ConviteDTO.java
export interface GerarLinkConviteRequest {
  tipoUsuario: TipoUsuario;
  diasValidade?: number;
}

export interface LinkConviteResponse {
  id: number;
  token: string;
  link: string;
  tipoUsuario: TipoUsuario;
  comarca?: string;
  departamento?: string;
  expiraEm: string;
  criadoPorNome?: string;
  usado?: boolean;
}

export interface ValidarConviteResponse {
  email: string;
  nome: string;
  telefone: string;
  dataExpiracao: string | undefined;
  criadoPor: string;
  criadoPorNome: any;
  valido: boolean;
  tipoUsuario?: TipoUsuario;
  comarca?: string;
  departamento?: string;
  expiraEm?: string;
  mensagem?: string;
  camposEditaveis?: string[];
}

export interface CriarConviteRequest {
  email: string;
  tipoUsuario: TipoUsuario;
}

export interface ConviteResponse {
  id: number;
  token: string;
  email?: string;
  tipoUsuario: TipoUsuario;
  status: StatusConvite;
  linkConvite?: string;
  comarca?: string;
  departamento?: string;
  criadoEm: string;
  expiraEm: string;
  criadoPorNome?: string;
  criadoPorId?: number;
  usosRestantes?: number;
  quantidadeUsos?: number;
  isGenerico?: boolean;
}

export interface AtivarConviteRequest {
  token: string;
  nome: string;
  email?: string;
  senha: string;
  confirmaSenha: string;
  cargo?: string;
}

export interface AtivarConviteResponse {
  success: boolean;
  message: string;
  usuario?: UsuarioInfoDTO;
}

export interface UsuarioInfoDTO {
  id: number;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  comarca?: string;
  departamento?: string;
  cargo?: string;
}

export interface ConviteListItem {
  id: number;
  email?: string;
  tipoUsuario: TipoUsuario;
  status: StatusConvite;
  comarca?: string;
  departamento?: string;
  criadoEm: string;
  expiraEm: string;
  ativadoEm?: string;
  expirado?: boolean;
  criadoPorNome?: string;
  usuarioCriadoNome?: string;
  isGenerico?: boolean;
  usado?: boolean;
}

export interface ConviteStats {
  totalConvites?: number;
  pendentes?: number;
  ativados?: number;
  expirados?: number;
  cancelados?: number;
  aguardandoVerificacao?: number;
  convitesGenericos?: number;
  convitesEspecificos?: number;
}

export interface PreCadastroRequest {
  token: string;
  email: string;
  nome: string;
  senha: string;
  confirmaSenha: string;
  cargo?: string;
}

export interface PreCadastroResponse {
  success: boolean;
  message: string;
  email?: string;
  expiracaoVerificacao?: string;
}

export interface VerificarEmailRequest {
  token: string;
}

export interface VerificarEmailResponse {
  success: boolean;
  message: string;
  usuario?: UsuarioInfoDTO;
  loginUrl?: string;
}

// Response Types Genéricos
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  timestamp?: string;
  status?: number;
  error?: string;
}

// Response Types para Comparecimento (mantendo estrutura existente com ajustes)
export interface ComparecimentoResponse {
  id: number;
  custodiadoId: number;
  custodiadoNome?: string;
  processoCustodiado?: string;
  dataComparecimento: string;
  horaComparecimento?: string;
  tipoValidacao: TipoValidacao;
  observacoes?: string;
  validadoPor: string;
  anexos?: string;
  mudancaEndereco?: boolean;
  motivoMudancaEndereco?: string;
  criadoEm?: string;
  atualizadoEm?: string;
  version?: number;
}

export interface ListarComparecimentosParams {
  page?: number;
  size?: number;
}

export interface ListarComparecimentosResponse {
  comparecimentos: ComparecimentoResponse[];
  paginaAtual: number;
  totalPaginas: number;
  totalItens: number;
  itensPorPagina: number;
  temProxima?: boolean;
  temAnterior?: boolean;
}

// Response Types para Endereço (mantendo estrutura existente)
export interface EnderecoResponse {
  id: number;
  cep: string;
  logradouro: string;
  numero?: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  nomeEstado?: string;
  regiaoEstado?: string;
  dataInicio?: string;
  dataFim?: string | null;
  ativo?: boolean;
  motivoAlteracao?: string;
  validadoPor?: string;
  enderecoCompleto?: string;
  enderecoResumido?: string;
  diasResidencia?: number;
  periodoResidencia?: string;
  criadoEm?: string;
  atualizadoEm?: string | null;
}

export interface HistoricoEnderecoResponse {
  id: number;
  custodiadoId: number;
  endereco: EnderecoDTO;
  dataInicio: string;
  dataFim?: string;
  enderecoAtivo: boolean;
  motivoAlteracao?: string;
  criadoEm: string;
}

// Response Types para Usuário
export interface UsuarioResponse {
  id: number;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  departamento?: string;
  comarca?: string;
  cargo?: string;
  telefone?: string;
  ativo: boolean;
  avatar?: string;
  criadoEm?: string;
  ultimoLogin?: string;
  atualizadoEm?: string;
}

// Response Types para Estatísticas (baseado em ComparecimentoResponseDTO.java)
export interface EstatisticasComparecimento {
  periodo?: { dataInicio?: string; dataFim?: string };
  totalComparecimentos: number;
  comparecimentosPresenciais: number;
  comparecimentosOnline: number;
  cadastrosIniciais: number;
  mudancasEndereco: number;
  percentualPresencial?: number;
  percentualOnline?: number;
  mediaDiasEntreMudancas?: number;
  comparecimentosAtrasados?: number;

}

export interface EstatisticasGerais {
  totalComparecimentos: number;
  comparecimentosPresenciais: number;
  comparecimentosOnline: number;
  cadastrosIniciais: number;
  totalMudancasEndereco: number;
  comparecimentosHoje: number;
  comparecimentosEsteMes: number;
  custodiadosComComparecimento: number;
  percentualPresencial?: number;
  percentualOnline?: number;
  mediaComparecimentosPorCustodiado?: number;
}

export interface ResumoSistema {
  totalCustodiados: number;
  custodiadosEmConformidade: number;
  custodiadosInadimplentes: number;
  comparecimentosHoje: number;
  totalComparecimentos: number;
  comparecimentosEsteMes?: number;
  totalMudancasEndereco?: number;
  enderecosAtivos?: number;
  custodiadosSemHistorico?: number;
  custodiadosSemEnderecoAtivo?: number;
  percentualConformidade?: number;
  percentualInadimplencia?: number;
  dataConsulta?: string;
  relatorioUltimosMeses?: RelatorioUltimosMeses;
  tendenciaConformidade?: TendenciaMensal[];
  proximosComparecimentos?: ProximosComparecimentos;
  analiseComparecimentos?: AnaliseComparecimentos;
  analiseAtrasos?: AnaliseAtrasos;
  comparecimentosAtrasados?: number;
  proximosComparecimentos7Dias?: number;
  ultimaAtualizacao?: string;
}

export interface RelatorioUltimosMeses {
  mesesAnalisados: number;
  periodoInicio: string;
  periodoFim: string;
  totalComparecimentos: number;
  comparecimentosPresenciais: number;
  comparecimentosOnline: number;
  mudancasEndereco: number;
  mediaComparecimentosMensal: number;
  percentualPresencial: number;
  percentualOnline: number;
}

export interface TendenciaMensal {
  mes: string;
  mesNome: string;
  totalCustodiados: number;
  emConformidade: number;
  inadimplentes: number;
  taxaConformidade: number;
  taxaInadimplencia: number;
  totalComparecimentos: number;
}

export interface ProximosComparecimentos {
  diasAnalisados: number;
  totalPrevistoProximosDias: number;
  totalAtrasados: number;
  comparecimentosHoje: number;
  comparecimentosAmanha: number;
  detalhesPorDia?: ComparecimentoDiario[];
  custodiadosAtrasados?: DetalheCustodiado[];
}

export interface ComparecimentoDiario {
  data: string;
  diaSemana: string;
  totalPrevisto: number;
  custodiados?: DetalheCustodiado[];
}

export interface DetalheCustodiado {
  id: number;
  nome: string;
  processo: string;
  periodicidade: string;
  diasAtraso: number;
}

export interface AnaliseComparecimentos {
  comparecimentosUltimos30Dias: number;
  comparecimentosOnlineUltimos30Dias: number;
  comparecimentosPresenciaisUltimos30Dias: number;
  taxaOnlineUltimos30Dias: number;
  comparecimentosPorDiaSemana?: Record<string, number>;
  comparecimentosPorHora?: Record<string, number>;
}

export interface AnaliseAtrasos {
  totalCustodiadosAtrasados: number;
  totalAtrasados30Dias: number;
  totalAtrasados60Dias: number;
  totalAtrasados90Dias: number;
  totalAtrasadosMais90Dias: number;
  mediaDiasAtraso: number;
  distribuicaoAtrasos?: Record<string, number>;
  custodiadosAtrasados30Dias?: DetalheCustodiadoAtrasado[];
  custodiadosAtrasados60Dias?: DetalheCustodiadoAtrasado[];
  custodiadosAtrasados90Dias?: DetalheCustodiadoAtrasado[];
  custodiadosAtrasadosMais90Dias?: DetalheCustodiadoAtrasado[];
  custodiadoMaiorAtraso?: DetalheCustodiadoAtrasado;
  dataAnalise: string;
}

export interface DetalheCustodiadoAtrasado {
  id: number;
  nome: string;
  processo: string;
  periodicidade: string;
  diasAtraso: number;
  dataUltimoComparecimento?: string;
  dataProximoComparecimento?: string;
  vara?: string;
  comarca?: string;
  contato?: string;
  enderecoAtual?: string;
}

export interface EstatisticasEnderecoResponse {
  totalMudancas: number;
  mudancasUltimoMes: number;
  cidadesMaisFrequentes: Array<{ cidade: string; total: number }>;
  estadosMaisFrequentes: Array<{ estado: string; total: number }>;
}

export interface SetupStatusResponse {
  setupRequired?: boolean;
  setupCompleted?: boolean;
  configured?: boolean;
  appName?: string;
  version?: string;
  message?: string;
  timestamp: string;
}

export interface VerificacaoStatusResponse {
  email: string;
  verified: boolean;
  validadePorMinutos?: number;
  tentativasPermitidas?: number;
}

export interface HealthResponse {
  status: 'UP' | 'DOWN';
  timestamp: string;
  details?: Record<string, any>;
}

export interface AppInfoResponse {
  name: string;
  version: string;
  description: string;
  environment: string;
  buildTime?: string;
  javaVersion?: string;
  springBootVersion?: string;
}

// Parametros de Consulta
export interface PeriodoParams {
  inicio?: string;
  fim?: string;
  dataInicio?: string;
  dataFim?: string;
}

export interface BuscarParams {
  termo?: string;
  nome?: string;
  cpf?: string;
  processo?: string;
  status?: 'EM_CONFORMIDADE' | 'INADIMPLENTE';
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  size?: number;
}

export interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
}

export interface StatusVerificacaoResponse {
  pessoasMarcadas: number;
  executadoEm: string;
  tipo: string;
}

export interface StatusEstatisticasResponse {
  totalCustodiados: number;
  emConformidade: number;
  inadimplentes: number;
  dataConsulta: string;
  percentualConformidade: number;
}

// Interfaces mantidas do frontend
export interface ListarCustodiadosResponse {
  success: boolean;
  message: string;
  data: CustodiadoData[];
  timestamp?: string;
  total?: number;
}

// Type Guards (mantidos para compatibilidade)
export function isListarCustodiadosResponse(data: any): data is ListarCustodiadosResponse {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.success === 'boolean' &&
    typeof data.message === 'string' &&
    Array.isArray(data.data)
  );
}

export function isCustodiadoResponse(data: any): data is CustodiadoDTO {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.nome === 'string' &&
    typeof data.processo === 'string' &&
    typeof data.vara === 'string' &&
    typeof data.comarca === 'string'
  );
}

// Aliases para compatibilidade com código existente
export type LoginRequest = LoginRequestDTO;
export type LoginResponse = LoginResponseDTO;
export type RefreshTokenRequest = RefreshTokenRequestDTO;
export type RefreshTokenResponse = RefreshTokenResponseDTO;
export type LogoutRequest = LogoutRequestDTO;
export type AlterarSenhaRequest = AlterarSenhaDTO;
export type ResetSenhaRequest = PasswordResetRequestDTO;
export type ConfirmarResetRequest = PasswordResetConfirmDTO;
export type CustodiadoResponse = ApiResponse<CustodiadoData>;
export type EstatisticasComparecimentoResponse = EstatisticasComparecimento;
export type ResumoSistemaResponse = ResumoSistema;

import type { Processo } from './processo';

export interface CustodiadoComProcessos extends CustodiadoData {
  processos: Processo[];
}
