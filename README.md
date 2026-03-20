# Adaptação Frontend ACLP - Pacote de Mudanças

## Resumo das Mudanças

Este pacote contém todas as alterações necessárias para adaptar o frontend do sistema ACLP
à reestruturação do backend com a nova tabela PROCESSOS.

---

## NOVOS ARQUIVOS

### 1. `types/processo.ts` (F1)
- Tipos TypeScript para `Processo`, `ProcessoDTO`, `ProcessoListResponse`, `ContadoresDashboard`
- Enums `SituacaoProcesso` e `StatusComparecimento` específicos para processos
- Configurações de badge para situação e status

### 2. `services/processoService.ts` (F2)
- Serviço de API completo para todos os endpoints de `/api/processos`
- Inclui: listar, buscarPorId, buscarPorCustodiado, buscarPorNumero, criar, atualizar, encerrar, suspender, reativar, inadimplentes, hoje, contadores

### 3. `hooks/useProcessos.ts` (F2)
- Hook React para gestão de processos com state management
- Paginação, filtros, CRUD completo
- Funções para contadores do dashboard, inadimplentes, comparecimentos de hoje

### 4. `components/ProcessoForm.tsx` (F5)
- Formulário completo para criação de novo processo
- Validação de formato CNJ
- Periodicidade com opções padrão + personalizada
- Validação de datas (decisão não futura, comparecimento >= decisão)

### 5. `components/ProcessoActions.tsx` (F10)
- Botões de ação para gestão de processo: Encerrar, Suspender, Reativar
- Diálogos de confirmação para cada ação
- Modo compacto para uso em tabelas

### 6. `components/SituacaoBadge.tsx`
- Badges reutilizáveis para `SituacaoProcesso` (ATIVO/ENCERRADO/SUSPENSO)
- Badge para `StatusComparecimento` (EM_CONFORMIDADE/INADIMPLENTE)

### 7. `components/ProcessosList.tsx` (F4)
- Lista de processos de um custodiado
- Usado na tela de detalhe do custodiado (Seção 2)
- Botão "Adicionar Processo", ações por processo, indicadores de atraso

---

## ARQUIVOS MODIFICADOS (Bug Fixes)

### 8. `lib/utils/inputFormatters.ts` - BUG FIXES
**Correção: Campo periodicidade**
- Mudado de `type="number"` para `type="text"` com `inputMode="numeric"`
- Aceita apenas números positivos
- Remove zeros à esquerda
- Limita máximo a 365

**Correção: RG**
- `InputFormatRG` agora aceita até 10 dígitos (era 9)
- `maxLength` da mask `rg` aumentado para 14 (formatado: 00.000.000-00)

### 9. `lib/utils/formatting.ts` - BUG FIXES
**Correção: RG**
- `FormattingRG` agora aceita RGs de 7 a 10 dígitos
- Formatação adaptada para diferentes tamanhos

**Correção: Data null**
- `normalizarDataParaEnvio` agora trata `null` e `undefined`
- Retorna data atual como fallback seguro
- Validação adicional do formato antes de retornar

### 10. `lib/utils/validation.ts` - BUG FIXES
**Correção: RG**
- Nova função `ValidationRG` que aceita 7-10 dígitos
- `ValidationComparecimentoForm` atualizado com range correto para RG

**Correção: Datas**
- Tratamento seguro de null em todas as validações de data

### 11. `lib/utils/dateutils.ts` - BUG FIXES
**Correção: Data null em toda a aplicação**
- Todas as funções agora aceitam `null | undefined` como parâmetro
- `formatToBrazilianDate` aceita `Date | string | null | undefined`
- `parseLocalDate` trata strings com 'T' (timestamps)
- Nova função `safeFormatDate` com fallback configurável
- Nenhuma função retorna "Invalid Date" ou "NaN"

---

## COMO APLICAR AS MUDANÇAS

### Novos Arquivos
Copie os seguintes arquivos para seus diretórios correspondentes:
```
types/processo.ts          → src/types/processo.ts
services/processoService.ts → src/services/processoService.ts
hooks/useProcessos.ts      → src/hooks/useProcessos.ts
components/ProcessoForm.tsx → src/components/ProcessoForm.tsx
components/ProcessoActions.tsx → src/components/ProcessoActions.tsx
components/SituacaoBadge.tsx → src/components/SituacaoBadge.tsx
components/ProcessosList.tsx → src/components/ProcessosList.tsx
```

### Arquivos Corrigidos (substituir os existentes)
```
lib/utils/inputFormatters.ts → src/lib/utils/inputFormatters.ts
lib/utils/formatting.ts      → src/lib/utils/formatting.ts
lib/utils/validation.ts      → src/lib/utils/validation.ts
lib/utils/dateutils.ts       → src/lib/utils/dateutils.ts
```

### Exportar useProcessos no hooks/index.ts
Adicione ao arquivo `hooks/index.ts`:
```typescript
export { useProcessos } from './useProcessos';
```

---

## ORDEM SUGERIDA DE INTEGRAÇÃO (próximos passos)

1. ✅ Tipos TypeScript (F1) - FEITO
2. ✅ Serviço de API (F2) - FEITO
3. ✅ Bug fixes (periodicidade, RG, datas null) - FEITO
4. ✅ Formulário de novo processo (F5) - FEITO
5. ✅ Ações de gestão de processo (F10) - FEITO
6. ✅ Lista de processos para detalhe do custodiado (F4 parcial) - FEITO
7. Adaptar dashboard com contadores (F7) - usar `useProcessos().buscarContadores()`
8. Migrar listagem principal (F3) - usar `useProcessos().listar()` no lugar de `useCustodiados()`
9. Adaptar inadimplentes (F8) - usar `useProcessos().buscarInadimplentes()`
10. Adaptar comparecimentos de hoje (F9) - usar `useProcessos().buscarHoje()`
11. Adaptar registro de comparecimento (F6) - enviar `processoId` em vez de `custodiadoId`
12. Integrar ProcessosList no componente DetalhesCustodiado (F4 completo)
