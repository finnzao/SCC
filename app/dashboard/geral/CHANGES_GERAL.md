# Mudanças em app/dashboard/geral/page.tsx

## O que mudou:
1. **Removido**: Imports de `DetalhesCustodiadoModal` e `EditarCustodiadoModal`
2. **Removido**: Estados `selecionado` e `editando` 
3. **Removido**: Renderização dos modais no final do componente
4. **Adicionado**: Função `handleVerDetalhes(id)` que navega para `/dashboard/custodiado/{id}`
5. **Alterado**: Botão "Visualizar" e "Ver Detalhes" agora usa `handleVerDetalhes`
6. **Alterado**: Linhas da tabela e cards mobile agora são clicáveis (onClick no tr/div)

## Busca e Substitui (para aplicar manualmente):

### 1. Remover imports de modais:
```
// REMOVER ESTAS LINHAS:
import DetalhesCustodiadoModal from '@/components/DetalhesCustodiado';
import EditarCustodiadoModal from '@/components/EditarCustodiado';
```

### 2. Remover estados:
```
// REMOVER:
const [selecionado, setSelecionado] = useState<CustodiadoFormatado | null>(null);
const [editando, setEditando] = useState<CustodiadoFormatado | null>(null);
```

### 3. Adicionar função de navegação (após handleRefresh):
```
const handleVerDetalhes = (id: number) => {
  router.push(`/dashboard/custodiado/${id}`);
};
```

### 4. Substituir onClick dos botões:
```
// ANTES:
onClick={() => setSelecionado(item)}
// DEPOIS:
onClick={() => handleVerDetalhes(item.id)}
```

### 5. Remover modais no final do JSX:
```
// REMOVER TODO O BLOCO:
{selecionado && (
  <DetalhesCustodiadoModal ... />
)}
{editando && (
  <EditarCustodiadoModal ... />
)}
```

### 6. Adicionar cursor-pointer e onClick nas linhas da tabela:
```
// ANTES:
<tr className={`border-b ...`}>
// DEPOIS:
<tr className={`border-b ... cursor-pointer`} onClick={() => handleVerDetalhes(item.id)}>
```
