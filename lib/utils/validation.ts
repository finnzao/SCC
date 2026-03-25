import { ComparecimentoFormData, FormValidation } from '@/types/comparecimento';

export const ValidationEmailFormat = (email: string): boolean => {
  if (!email) return false;
  const formatted = email.trim().toLowerCase();
  if (formatted.length < 5 || formatted.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(formatted)) return false;
  const [localPart, domainPart] = formatted.split('@');
  if (localPart.length > 64) return false;
  if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
  if (localPart.includes('..')) return false;
  if (!domainPart || domainPart.length < 3) return false;
  if (domainPart.startsWith('-') || domainPart.endsWith('-')) return false;
  if (domainPart.startsWith('.') || domainPart.endsWith('.')) return false;
  if (domainPart.includes('..')) return false;
  if (!domainPart.includes('.')) return false;
  const parts = domainPart.split('.');
  const tld = parts[parts.length - 1];
  if (tld.length < 2 || tld.length > 6) return false;
  if (!/^[a-zA-Z]+$/.test(tld)) return false;
  return true;
};

export const ValidationEmailInstitucional = (email: string): boolean => {
  if (!ValidationEmailFormat(email)) return false;
  return email.trim().toLowerCase().endsWith('@tjba.jus.br');
};

export const ValidationEmailList = (emails: string[] | string): {
  valid: string[];
  invalid: string[];
  total: number;
  allValid: boolean;
} => {
  let emailList: string[] = [];
  if (typeof emails === 'string') {
    emailList = emails.split(/[,;\n]+/).map(e => e.trim()).filter(e => e.length > 0);
  } else {
    emailList = emails.map(e => e.trim()).filter(e => e.length > 0);
  }
  const valid: string[] = [];
  const invalid: string[] = [];
  emailList.forEach(email => {
    if (ValidationEmailFormat(email)) {
      valid.push(email.trim().toLowerCase());
    } else {
      invalid.push(email);
    }
  });
  return { valid, invalid, total: emailList.length, allValid: invalid.length === 0 };
};

export const ValidationCPF = (cpf: string): boolean => {
  if (!cpf) return true;
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned.charAt(i)) * (10 - i);
  let checkDigit = 11 - (sum % 11);
  if (checkDigit === 10 || checkDigit === 11) checkDigit = 0;
  if (checkDigit !== parseInt(cleaned.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned.charAt(i)) * (11 - i);
  checkDigit = 11 - (sum % 11);
  if (checkDigit === 10 || checkDigit === 11) checkDigit = 0;
  if (checkDigit !== parseInt(cleaned.charAt(10))) return false;
  return true;
};

export const ValidationPhone = (phone: string): boolean => {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || cleaned.length === 11;
};

export const ValidationCEP = (cep: string): boolean => {
  if (!cep) return false;
  const cleaned = cep.replace(/\D/g, '');
  return cleaned.length === 8 && !/^0+$/.test(cleaned);
};

export const ValidationProcessNumber = (process: string): boolean => {
  if (!process) return false;
  const processRegex = /^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/;
  return processRegex.test(process);
};

export const ValidationEstado = (estado: string): boolean => {
  if (!estado) return false;
  const estadoRegex = /^[A-Z]{2}$/;
  if (!estadoRegex.test(estado)) return false;
  const estadosValidos = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];
  return estadosValidos.includes(estado);
};

export const ValidationDocuments = (cpf?: string, rg?: string): { isValid: boolean; error?: string } => {
  const hasCpf = cpf?.trim();
  const hasRg = rg?.trim();
  if (!hasCpf && !hasRg) {
    return { isValid: false, error: 'Pelo menos CPF ou RG deve ser informado' };
  }
  if (hasCpf && !ValidationCPF(cpf!)) {
    return { isValid: false, error: 'CPF inválido' };
  }
  return { isValid: true };
};

// ✅ FIX: RG validation now accepts 7-10 digits
// O RG tradicional (Carteira de Identidade) costuma ter 8 ou 9 dígitos
// Alguns estados emitem com 7 ou 10 dígitos
export const ValidationRG = (rg: string): boolean => {
  if (!rg) return true; // RG é opcional
  const cleaned = rg.replace(/\D/g, '');
  return cleaned.length >= 7 && cleaned.length <= 10;
};

export const ValidationValidadoPor = (validadoPor: string): { isValid: boolean; error?: string } => {
  const trimmed = validadoPor?.trim();
  if (!trimmed) return { isValid: false, error: 'Campo "Validado por" é obrigatório' };
  if (trimmed.length < 5) return { isValid: false, error: 'Campo "Validado por" deve ter no mínimo 5 caracteres' };
  if (trimmed.length > 100) return { isValid: false, error: 'Campo "Validado por" deve ter no máximo 100 caracteres' };
  return { isValid: true };
};

export const ValidationObservacoes = (observacoes?: string): { isValid: boolean; error?: string } => {
  if (!observacoes?.trim()) return { isValid: true };
  const trimmed = observacoes.trim();
  if (trimmed.length < 10) return { isValid: false, error: 'Observações deve ter no mínimo 10 caracteres' };
  if (trimmed.length > 500) return { isValid: false, error: 'Observações deve ter no máximo 500 caracteres' };
  return { isValid: true };
};

export const ValidationMotivoMudanca = (motivo?: string, mudancaEndereco?: boolean): { isValid: boolean; error?: string } => {
  if (!mudancaEndereco) return { isValid: true };
  if (!motivo?.trim()) return { isValid: false, error: 'Motivo da mudança de endereço é obrigatório' };
  const trimmed = motivo.trim();
  if (trimmed.length < 10) return { isValid: false, error: 'Motivo da mudança deve ter no mínimo 10 caracteres' };
  if (trimmed.length > 500) return { isValid: false, error: 'Motivo da mudança deve ter no máximo 500 caracteres' };
  return { isValid: true };
};

export const ValidationAnexos = (anexos?: string): { isValid: boolean; error?: string } => {
  if (!anexos?.trim()) return { isValid: true };
  const trimmed = anexos.trim();
  if (trimmed.length < 3) return { isValid: false, error: 'Anexos deve ter no mínimo 3 caracteres' };
  if (trimmed.length > 1000) return { isValid: false, error: 'Anexos deve ter no máximo 1000 caracteres' };
  return { isValid: true };
};

export const ValidationComparecimentoForm = (data: ComparecimentoFormData): FormValidation => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  if (!data.nome?.trim()) errors.nome = 'Nome é obrigatório';
  else if (data.nome.trim().length < 2) errors.nome = 'Nome deve ter no mínimo 2 caracteres';
  else if (data.nome.trim().length > 150) errors.nome = 'Nome deve ter no máximo 150 caracteres';

  if (data.cpf?.trim() && !ValidationCPF(data.cpf)) errors.cpf = 'CPF deve ter o formato 000.000.000-00';

  // ✅ FIX: RG validation range 7-10 digits
  if (data.rg?.trim()) {
    const rgClean = data.rg.replace(/\D/g, '');
    if (rgClean.length < 7 || rgClean.length > 10) {
      errors.rg = 'RG deve ter entre 7 e 10 dígitos';
    }
  }

  if (!data.contato?.trim()) errors.contato = 'Contato é obrigatório';
  else if (!ValidationPhone(data.contato)) errors.contato = 'Contato deve ter formato válido de telefone';

  if (!data.processo?.trim()) errors.processo = 'Processo é obrigatório';
  else if (!ValidationProcessNumber(data.processo)) errors.processo = 'Processo deve ter o formato 0000000-00.0000.0.00.0000';

  if (!data.vara?.trim()) errors.vara = 'Vara é obrigatória';
  else if (data.vara.trim().length > 100) errors.vara = 'Vara deve ter no máximo 100 caracteres';

  if (!data.comarca?.trim()) errors.comarca = 'Comarca é obrigatória';
  else if (data.comarca.trim().length > 100) errors.comarca = 'Comarca deve ter no máximo 100 caracteres';

  if (!data.decisao) errors.decisao = 'Data da decisão é obrigatória';

  if (!data.periodicidade || data.periodicidade < 1) errors.periodicidade = 'Periodicidade é obrigatória';

  if (!data.dataComparecimentoInicial) errors.dataComparecimentoInicial = 'Data do comparecimento inicial é obrigatória';

  const obsValidation = ValidationObservacoes(data.observacoes);
  if (!obsValidation.isValid) errors.observacoes = obsValidation.error!;

  if (!data.endereco?.cep?.trim()) errors.cep = 'CEP é obrigatório';
  else if (!ValidationCEP(data.endereco.cep)) errors.cep = 'CEP deve ter o formato 00000-000';

  if (!data.endereco?.logradouro?.trim()) errors.logradouro = 'Logradouro é obrigatório';
  else if (data.endereco.logradouro.trim().length < 5) errors.logradouro = 'Logradouro deve ter no mínimo 5 caracteres';
  else if (data.endereco.logradouro.trim().length > 200) errors.logradouro = 'Logradouro deve ter no máximo 200 caracteres';

  if (data.endereco?.numero?.trim() && data.endereco.numero.trim().length > 20) errors.numero = 'Número deve ter no máximo 20 caracteres';

  if (data.endereco?.complemento?.trim()) {
    const compTrimmed = data.endereco.complemento.trim();
    if (compTrimmed.length < 3) errors.complemento = 'Complemento deve ter no mínimo 3 caracteres';
    else if (compTrimmed.length > 100) errors.complemento = 'Complemento deve ter no máximo 100 caracteres';
  }

  if (!data.endereco?.bairro?.trim()) errors.bairro = 'Bairro é obrigatório';
  else if (data.endereco.bairro.trim().length < 2) errors.bairro = 'Bairro deve ter no mínimo 2 caracteres';
  else if (data.endereco.bairro.trim().length > 100) errors.bairro = 'Bairro deve ter no máximo 100 caracteres';

  if (!data.endereco?.cidade?.trim()) errors.cidade = 'Cidade é obrigatória';
  else if (data.endereco.cidade.trim().length < 2) errors.cidade = 'Cidade deve ter no mínimo 2 caracteres';
  else if (data.endereco.cidade.trim().length > 100) errors.cidade = 'Cidade deve ter no máximo 100 caracteres';

  if (!data.endereco?.estado?.trim()) errors.estado = 'Estado é obrigatório';
  else if (!ValidationEstado(data.endereco.estado)) errors.estado = 'Estado deve ser uma sigla válida com 2 letras maiúsculas';

  const docValidation = ValidationDocuments(data.cpf, data.rg);
  if (!docValidation.isValid) errors.documentos = docValidation.error!;

  return { isValid: Object.keys(errors).length === 0, errors, warnings };
};

export const ValidationNumericKey = (event: React.KeyboardEvent): boolean => {
  const key = event.key;
  const isNumber = /^\d$/.test(key);
  const isControl = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key);
  const isModifier = event.ctrlKey || event.metaKey;
  return isNumber || isControl || isModifier;
};

export const ValidationAlphabeticKey = (event: React.KeyboardEvent): boolean => {
  const key = event.key;
  const char = event.key.length === 1 ? event.key : '';
  const isLetter = /^[a-zA-ZÀ-ÿ\s\-'.]$/.test(char);
  const isControl = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key);
  const isModifier = event.ctrlKey || event.metaKey;
  return isLetter || isControl || isModifier;
};

export const ValidationPhoneKey = (event: React.KeyboardEvent): boolean => {
  const key = event.key;
  const isNumber = /^\d$/.test(key);
  const isAllowedChar = ['(', ')', '-', ' '].includes(key);
  const isControl = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key);
  const isModifier = event.ctrlKey || event.metaKey;
  return isNumber || isAllowedChar || isControl || isModifier;
};
