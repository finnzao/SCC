import { describe, it, expect } from 'vitest';
import { validarRegistroPena, montarPayloadRegistroPena, FORM_VAZIO } from './execucaoPena';
import type { RegistroPenaForm } from '@/types/execucao';

const base: RegistroPenaForm = {
  ...FORM_VAZIO,
  numeroExecucao: '0000123-45.2026.8.05.0001',
  dataInicio: '2026-03-15',
};

describe('validarRegistroPena', () => {
  it('exige a escolha de um card', () => {
    const r = validarRegistroPena({ ...base, origemCalculo: null });
    expect(r.valido).toBe(false);
    expect(r.erros.origemCalculo).toBeDefined();
  });

  it('rejeita PEC fora do padrão CNJ', () => {
    const r = validarRegistroPena({ ...base, origemCalculo: 'SENTENCA', numeroExecucao: '123', dataTermino: '2027-01-01' });
    expect(r.erros.numeroExecucao).toContain('CNJ');
  });

  it('SENTENCA: término anterior ao início é rejeitado; igual (pena de 1 dia) é aceito', () => {
    expect(validarRegistroPena({ ...base, origemCalculo: 'SENTENCA', dataTermino: '2026-03-14' }).valido).toBe(false);
    expect(validarRegistroPena({ ...base, origemCalculo: 'SENTENCA', dataTermino: '2026-03-15' }).valido).toBe(true);
  });

  it('DOSIMETRIA: tempo todo zerado é rejeitado', () => {
    const r = validarRegistroPena({ ...base, origemCalculo: 'DOSIMETRIA_CALCULADA' });
    expect(r.valido).toBe(false);
    expect(r.erros.anos).toBeDefined();
  });

  it('DOSIMETRIA: basta um componente maior que zero', () => {
    expect(validarRegistroPena({ ...base, origemCalculo: 'DOSIMETRIA_CALCULADA', meses: '6' }).valido).toBe(true);
  });
});

describe('montarPayloadRegistroPena', () => {
  it('SENTENCA envia dataTermino e NUNCA anos/meses/dias', () => {
    const p = montarPayloadRegistroPena({ ...base, origemCalculo: 'SENTENCA', dataTermino: '2028-09-24', anos: '2' }, 7);
    expect(p).toMatchObject({ processoId: 7, origemCalculo: 'SENTENCA', dataTermino: '2028-09-24' });
    expect(p.anos).toBeUndefined();
    expect(p.meses).toBeUndefined();
    expect(p.dias).toBeUndefined();
  });

  it('DOSIMETRIA envia anos/meses/dias numéricos e NUNCA dataTermino', () => {
    const p = montarPayloadRegistroPena(
      { ...base, origemCalculo: 'DOSIMETRIA_CALCULADA', anos: '2', meses: '6', dias: '10', dataTermino: '2030-01-01' }, 7);
    expect(p).toMatchObject({ anos: 2, meses: 6, dias: 10 });
    expect(p.dataTermino).toBeUndefined();
  });

  it('campos opcionais vazios ficam fora do payload', () => {
    const p = montarPayloadRegistroPena({ ...base, origemCalculo: 'SENTENCA', dataTermino: '2027-01-01' }, 7);
    expect('guiaRecolhimento' in p).toBe(false);
    expect('observacoes' in p).toBe(false);
    expect('numeroSeeu' in p).toBe(false);
    expect('diasDetraidos' in p).toBe(false);
  });

  it('modo calculado (E3): detração e SEEU entram quando preenchidos', () => {
    const p = montarPayloadRegistroPena(
      { ...base, origemCalculo: 'SENTENCA', dataTermino: '2027-01-01', diasDetraidos: '60', numeroSeeu: '0001234-56.2026.8.05.0001' }, 7);
    expect(p.diasDetraidos).toBe(60);
    expect(p.numeroSeeu).toBe('0001234-56.2026.8.05.0001');
  });

  it('detração negativa é rejeitada', () => {
    const r = validarRegistroPena({ ...base, origemCalculo: 'SENTENCA', dataTermino: '2027-01-01', diasDetraidos: '-5' });
    expect(r.valido).toBe(false);
  });
});
