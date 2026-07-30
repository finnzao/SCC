# ACLP — Manual do Usuário

**Sistema de Acompanhamento de Comparecimento e Localização de Pessoas — TJBA**

Este manual explica como usar o sistema no dia a dia. Não é preciso conhecimento técnico.

---

## O que é o ACLP

Quando a Justiça determina que uma pessoa deve se apresentar periodicamente ao fórum, alguém precisa acompanhar se isso está sendo cumprido. O ACLP é onde esse acompanhamento acontece.

O sistema guarda:

- **quem** é a pessoa acompanhada (o *custodiado*) e onde ela mora;
- **qual processo** determinou a medida e **de quanto em quanto tempo** ela deve comparecer;
- **cada comparecimento** que aconteceu, com data, tipo e quem validou;
- **quem está atrasado**, calculado automaticamente.

A partir dos dados cadastrados, o sistema calcula sozinho a data do próximo comparecimento e sinaliza quem não cumpriu o prazo.

---

## Quem pode usar

| Perfil | O que pode fazer |
|---|---|
| **Administrador** | Tudo: cadastrar, editar, excluir, suspender processos, gerenciar usuários e enviar convites |
| **Usuário** | Consultar informações e registrar comparecimentos |

Só um administrador cria novos acessos. Não existe autocadastro — é preciso receber um convite.

---

## Acessando o sistema

Endereço: **https://scc-omega.vercel.app**

1. Informe seu e-mail institucional (`@tjba.jus.br`) e sua senha.
2. Clique em **Entrar**.

Você será levado ao painel principal.

### Se não conseguir entrar

| Mensagem | O que significa | O que fazer |
|---|---|---|
| "Credenciais inválidas" | E-mail ou senha incorretos | Confira o e-mail e refaça a senha. Se persistir, procure o administrador |
| "Conta bloqueada. Tente novamente em N minutos" | 5 tentativas erradas seguidas | Aguarde 30 minutos ou peça desbloqueio ao administrador |
| "Muitas tentativas. Aguarde..." | Muitas tentativas em pouco tempo | Espere um minuto e tente de novo |
| A tela demora muito na primeira vez | O servidor estava em repouso | Aguarde. Só acontece no primeiro acesso do dia |

**Esqueceu a senha?** Use *Esqueci minha senha* na tela de login. Você receberá um e-mail com o link de redefinição.

---

## Primeiro acesso (convite)

Quem é novo no sistema recebe um convite por e-mail.

1. Abra o e-mail e clique no link.
2. Preencha:
   - **Nome completo**
   - **Senha** — ver requisitos abaixo
   - **Confirmação da senha** — precisa ser idêntica
   - **Telefone** e **Cargo** — opcionais
3. Confirme.

### Requisitos de senha

A senha precisa ter **no mínimo 8 caracteres** e conter os quatro itens:

| Requisito | Exemplo |
|---|---|
| Uma letra minúscula | `a` |
| Uma letra maiúscula | `A` |
| Um número | `7` |
| Um caractere especial | `!` `@` `#` `_` `-` — qualquer símbolo serve |

Exemplo válido: `Fortaleza_2026`. Exemplo recusado: `fortaleza2026` (sem maiúscula e sem símbolo).

A tela mostra os quatro itens marcando em verde conforme você digita. Enquanto algum estiver pendente, o botão de confirmar permanece desabilitado.

> A mesma regra vale para trocar a senha depois, em **Configurações**.

Pronto: já dá para entrar com o e-mail que recebeu o convite e a senha que você acabou de criar.

> Convites têm prazo de validade. Se o link não funcionar mais, peça ao administrador para reenviar.

---

## Cadastrando uma pessoa

No menu, vá em **Registrar**. O formulário tem seis blocos. Os campos com asterisco são obrigatórios.

### 1. Dados pessoais

| Campo | Obrigatório | Como preencher |
|---|---|---|
| Nome | **Sim** | Nome completo, de 2 a 150 caracteres. Será gravado em maiúsculas |
| Contato | Não | Telefone. Se ficar em branco, o sistema registra "Pendente" |

### 2. Documentos

| Campo | Obrigatório | Como preencher |
|---|---|---|
| CPF | Ver abaixo | `000.000.000-00` ou só os números |
| RG | Ver abaixo | Até 20 caracteres |

> **Importante:** é obrigatório informar **CPF ou RG** — pelo menos um dos dois. Se deixar os dois em branco, o sistema não deixa salvar.

### 3. Dados processuais

| Campo | Obrigatório | Como preencher |
|---|---|---|
| Número do processo | **Sim** | Formato CNJ completo: `0000000-00.0000.0.00.0000` (20 dígitos). O campo aplica a máscara sozinho |
| Vara | **Sim** | Até 100 caracteres. Gravado em maiúsculas |
| Comarca | **Sim** | Até 100 caracteres. Gravada em maiúsculas |
| Data da decisão | **Sim** | Data em que a medida foi determinada |
| Data do comparecimento inicial | Não | Data do primeiro comparecimento |

### 4. Periodicidade

| Campo | Obrigatório | Como preencher |
|---|---|---|
| Periodicidade | **Sim** | Número de **dias** entre um comparecimento e o seguinte, de 1 a 365 |

É aqui que o sistema aprende o ritmo do acompanhamento. Comparecimento mensal, por exemplo, é `30`. Semanal é `7`.

### 5. Endereço

| Campo | Obrigatório | Como preencher |
|---|---|---|
| CEP | **Sim** | `00000-000` ou só os números |
| Logradouro | **Sim** | Rua, avenida etc. De 5 a 200 caracteres |
| Número | Não | Até 20 caracteres |
| Complemento | Não | Apartamento, bloco etc. Até 100 caracteres |
| Bairro | **Sim** | De 2 a 100 caracteres |
| Cidade | **Sim** | De 2 a 100 caracteres |
| Estado | **Sim** | Sigla de 2 letras. Ex.: `BA` |

### 6. Observações

| Campo | Obrigatório | Como preencher |
|---|---|---|
| Observações | Não | Anotações livres, até 500 caracteres |

Ao salvar, o sistema cria de uma só vez: a pessoa, o endereço, o processo e o registro do primeiro comparecimento.

---

## Registrando um comparecimento

É a operação mais frequente. Vá em **Comparecimento → Confirmar**.

| Campo | Obrigatório | Como preencher |
|---|---|---|
| Processo | **Sim** | Selecione o processo correspondente |
| Data do comparecimento | **Sim** | Quando a pessoa se apresentou |
| Hora | Não | Formato `14:30:00` |
| Tipo de validação | **Sim** | *Presencial*, *Online* ou *Cadastro inicial* |
| Validado por | **Sim** | Seu nome. Até 100 caracteres |
| Observações | Não | Até 500 caracteres |
| Houve mudança de endereço? | Não | Marque apenas se o endereço mudou |

Depois de salvar, o sistema recalcula a data do próximo comparecimento a partir da periodicidade do processo.

### Se o endereço mudou

Ao marcar **Houve mudança de endereço**, aparecem campos adicionais:

- **Motivo da mudança** — até 500 caracteres
- **Novo endereço completo** — mesmas regras do bloco 5 do cadastro

O endereço anterior não é apagado: fica registrado no histórico, com a data da troca. Dá para consultar todo o percurso de endereços da pessoa.

> Se marcar a opção, o endereço novo passa a ser obrigatório. Não é possível salvar com ele incompleto.

---

## Acompanhando quem está em atraso

O sistema classifica cada pessoa em dois estados:

| Situação | Significado |
|---|---|
| **Em conformidade** | Está cumprindo os comparecimentos no prazo |
| **Inadimplente** | Passou da data prevista sem comparecer |

Essa classificação é automática — vem da comparação entre a data do último comparecimento, a periodicidade e a data de hoje. Não é preciso marcar nada à mão.

Onde consultar:

- **Painel principal** — números gerais: total acompanhado, comparecimentos do dia, inadimplentes
- **Comparecimentos de hoje** — a agenda do dia
- **Inadimplentes** — a lista de quem está atrasado

---

## Consultando informações

### Buscar

O menu **Buscar** localiza pessoas por nome, CPF, RG ou número do processo.

### Ficha do custodiado

Clicando em uma pessoa você vê a ficha completa: dados pessoais, endereço atual, processos vinculados, histórico de comparecimentos e histórico de endereços.

### Histórico de comparecimentos

Lista todos os registros, com filtros por período e por situação. É onde se confere o que foi feito e quando.

### Exportar

A listagem pode ser exportada com os filtros aplicados, para relatórios e conferências.

---

## Situação dos processos

Um processo pode estar em três estados:

| Estado | O que significa |
|---|---|
| **Ativo** | Em acompanhamento normal |
| **Suspenso** | Temporariamente parado. Não gera cobrança de comparecimento |
| **Encerrado** | Finalizado judicialmente |

**Somente administradores** podem suspender ou reativar um processo.

Já as pessoas cadastradas podem estar **Ativas** (em acompanhamento) ou **Arquivadas** (fora de observação).

---

## Funções do administrador

### Convidar um novo usuário

1. Vá em **Configurações → Usuários**.
2. Clique em **Novo convite**.
3. Informe o **e-mail** e escolha o **tipo de acesso** (Administrador ou Usuário).
4. Envie.

A pessoa recebe o e-mail e conclui o próprio cadastro. Convites pendentes podem ser reenviados ou cancelados a qualquer momento.

### Estados de um convite

| Estado | Significado |
|---|---|
| **Pendente** | Enviado, aguardando a pessoa aceitar |
| **Ativado** | Aceito; a conta foi criada |
| **Expirado** | Passou do prazo sem ser usado |
| **Cancelado** | Cancelado pelo administrador |

### Situação dos usuários

| Situação | Significado |
|---|---|
| **Convidado** | Recebeu convite, ainda não acessou |
| **Ativo** | Acesso normal |
| **Inativo** | Acesso temporariamente suspenso |
| **Bloqueado** | Bloqueado por segurança |
| **Expirado** | Convite venceu sem ativação |

### Operações restritas

Estas ações só aparecem para administradores:

- excluir pessoas e processos;
- suspender e reativar processos;
- rodar a verificação de inadimplentes em massa;
- criar, editar e excluir usuários;
- gerenciar convites.

---

## Boas práticas

**Ao cadastrar**

- Confira o número do processo antes de salvar — ele é a chave de ligação de tudo.
- Informe CPF **e** RG quando tiver os dois. Facilita muito a busca depois.
- Preencha o telefone. Ele fica como "Pendente" se ficar em branco, e isso atrapalha o contato.
- Revise a periodicidade: é ela que comanda todo o cálculo de prazos.

**Ao registrar comparecimento**

- Registre no mesmo dia. Data retroativa distorce o cálculo do próximo prazo.
- Preencha "Validado por" com seu nome real — é o registro de quem conferiu.
- Sempre que a pessoa informar endereço novo, marque a mudança. O histórico só se mantém correto se isso for feito na hora.

**Segurança**

- Não compartilhe sua senha. Cada pessoa deve ter o próprio acesso.
- Saia do sistema ao deixar o computador, sobretudo em máquina compartilhada.
- Frases com símbolo e número (`Comarca_RioReal7`) são mais fortes e mais fáceis de lembrar que sequências curtas e embaralhadas.

---

## Perguntas frequentes

**Posso cadastrar sem CPF?**
Sim, desde que informe o RG. É obrigatório ter pelo menos um dos dois documentos.

**Errei um comparecimento. Como corrijo?**
As observações de um registro podem ser editadas. Para correções de data ou tipo, procure um administrador.

**Uma pessoa pode ter mais de um processo?**
Sim. Cada processo tem periodicidade e datas próprias, e o acompanhamento é feito separadamente para cada um.

**O que acontece se eu não registrar o comparecimento no dia?**
Passado o prazo, a pessoa aparece como inadimplente. Registrar depois regulariza a situação, mas o atraso fica no histórico.

**Como sei quem deve comparecer hoje?**
No painel principal, em **Comparecimentos de hoje**.

**Consigo ver os endereços antigos de alguém?**
Sim. Na ficha da pessoa, em **Histórico de endereços**, com as datas de cada mudança.

**Por que o sistema demora na primeira vez que abro no dia?**
O servidor entra em repouso quando fica sem uso. O primeiro acesso o desperta e pode levar alguns segundos. Os seguintes são rápidos.

**Esqueci minha senha e não recebi o e-mail.**
Confira a caixa de spam. Se não chegar, procure o administrador para reenviar o convite ou redefinir a senha.

---

## Suporte

Para problemas de acesso, desbloqueio de conta ou correções que exijam permissão de administrador, procure o administrador do sistema na sua comarca.

Para falhas técnicas, registre: **o que você estava fazendo**, **a mensagem exata que apareceu** e **o horário**. Esses três dados encurtam muito o diagnóstico.
