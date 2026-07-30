# ACLP — Documentação Técnica

**Sistema de Acompanhamento de Comparecimento e Localização de Pessoas — TJBA**

Documento de referência técnica. Cobre arquitetura, segurança, modelo de domínio, endpoints e — em detalhe — os parâmetros de cadastro.

---

## 1. Visão geral

O ACLP registra e fiscaliza o cumprimento de medidas cautelares de comparecimento periódico. Cada pessoa sob acompanhamento (*custodiado*) tem um ou mais *processos*, e cada processo define uma **periodicidade** em dias. O sistema calcula a data do próximo comparecimento, registra as validações feitas por servidores e sinaliza quem está inadimplente.

### Componentes

| Componente | Stack | Hospedagem |
|---|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind | Vercel — `scc-omega.vercel.app` |
| Backend | Spring Boot 3 (Java 17+), Spring Security, JPA/Hibernate | Render — `aclp-back.onrender.com` |
| Banco | PostgreSQL 15 | Supabase (pooler `aws-1-sa-east-1`) |
| Cache/blacklist | Redis (opcional; há fallback em memória) | — |

### Repositórios

- **Frontend:** `SCC`
- **Backend:** `aclp_back` — pacote raiz `br.jus.tjba.aclp`

---

## 2. Arquitetura de rede: proxy same-origin

O navegador **nunca** fala diretamente com o backend. Toda chamada sai para `/api/*` no próprio domínio do frontend, e o servidor Next repassa para o Render.

```
Navegador
   │  POST https://scc-omega.vercel.app/api/auth/login
   ▼
Servidor Next.js (Vercel)          ← rewrite em next.config.ts
   │  POST https://aclp-back.onrender.com/api/auth/login
   ▼
Spring Boot (Render)
   │
   ▼
PostgreSQL (Supabase)
```

O rewrite está em [`next.config.ts`](../next.config.ts):

```ts
async rewrites() {
  return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
}
```

### Por que essa arquitetura

Não é preferência de estilo — três propriedades de segurança dependem dela:

1. **O cookie de sessão é gravado no domínio do frontend.** Sem o proxy, o `Set-Cookie` do backend ficaria em `.onrender.com` e o middleware do Next — que roda no domínio da Vercel — não conseguiria lê-lo para proteger `/dashboard`.
2. **CORS deixa de existir.** Da perspectiva do navegador é tudo mesma origem.
3. **`connect-src 'self'` na CSP passa a ser viável.** Com ele, um XSS não consegue exfiltrar dados para um servidor externo, porque o navegador bloqueia qualquer `fetch` para fora da origem.

> **Consequência operacional:** `NEXT_PUBLIC_API_URL` **deve** valer `/api`. Apontá-la para a URL do Render quebra o login com `TypeError: Failed to fetch` (bloqueio de CSP), não com um erro de rede legível.

---

## 3. Variáveis de ambiente

### Frontend (Vercel)

| Variável | Valor | Escopo | Observação |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `/api` | Navegador | Embutida no bundle **em tempo de build** |
| `BACKEND_URL` | `https://aclp-back.onrender.com` | Servidor | Destino do rewrite. **Sem `/api` no final** |
| `JWT_SECRET` | *(idêntico ao do backend)* | Servidor | Usado pelo middleware para verificar a assinatura |

Três armadilhas recorrentes:

- **`NEXT_PUBLIC_*` é congelada no build.** Alterar a variável e apenas reiniciar não muda nada — é preciso um *redeploy*.
- **`BACKEND_URL` não leva prefixo `NEXT_PUBLIC_`.** É deliberado: a origem real do backend não vai para o navegador. O nome tem que ser exatamente esse — é o que [`next.config.ts`](../next.config.ts) lê.
- **`rewrites()` é avaliado em build time** e gravado no `routes-manifest.json`. `BACKEND_URL` precisa existir **no build**, não só em runtime.

### Backend (Render)

| Variável | Função |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `render` |
| `DATABASE_URL` / `DATABASE_USERNAME` / `DATABASE_PASSWORD` | Conexão JDBC com o Supabase |
| `JWT_SECRET` | Chave HMAC. Mínimo 32 caracteres (validado no boot) |
| `ACLP_CORS_ALLOWED_ORIGINS` | Origem liberada (residual — com o proxy, o CORS não é mais exercitado) |
| `ACLP_FRONTEND_URL` | Usado para montar links em e-mails (convite, reset de senha) |
| `ACLP_SELF_PING_ENABLED` / `ACLP_SELF_PING_URL` | Auto-ping para evitar hibernação do plano free do Render |
| `SWAGGER_ENABLED` | `false` em produção |

---

## 4. Autenticação e autorização

### Emissão do token

`POST /api/auth/login` → [`AuthService.login`](../../aclp_back/src/main/java/br/jus/tjba/aclp/service/AuthService.java)

Sequência de verificações, na ordem:

1. `checkRateLimiting(ip)` — mais de **10 tentativas por IP em 1 minuto** rejeita com "Muitas tentativas".
2. `findByEmail(email)` — não encontrado ⇒ `BadCredentialsException`.
3. `checkAccountLocked(usuario)` — `bloqueado_ate` no futuro ⇒ rejeita informando os minutos restantes.
4. `usuario.getAtivo()` — falso ⇒ `DisabledException`.
5. `authenticationManager.authenticate(...)` — `DaoAuthenticationProvider` compara a senha via `BCryptPasswordEncoder`.
6. MFA — **não implementado**. Conta com `mfa_enabled = true` é recusada com mensagem acionável (ver abaixo).
7. `handleConcurrentSessions` — controle de sessão simultânea.

Falha em 2, 4 ou 5 retorna **HTTP 401**. Todas as mensagens ao cliente são genéricas ("Credenciais inválidas") — é intencional: distinguir "e-mail não existe" de "senha errada" permitiria enumerar contas.

### Bloqueio por tentativas

- Limite: **5 tentativas falhadas** (`aclp.auth.max-login-attempts`)
- Duração: **30 minutos** (`aclp.auth.lockout-duration-minutes`)
- O contador só incrementa **se o e-mail existir** no banco.

### MFA — estado atual

Não está implementado: não há verificação TOTP nem provisionamento de segredo (a coluna `mfa_secret` nunca é preenchida). O sistema trata isso de forma explícita, em duas frentes:

- **No boot:** `aclp.auth.mfa-enabled=true` impede a aplicação de subir, com `IllegalStateException`. A propriedade prometeria um segundo fator que nenhum código verifica.
- **No login:** conta com `mfa_enabled = true` é recusada com mensagem acionável ("peça a um administrador para desativá-la"), em vez de erro genérico de servidor.

A checagem fica **depois** da verificação de senha, de propósito: revelar antes quais contas têm MFA daria um oráculo de enumeração a quem não sabe a senha.

Para reabilitar uma conta nesse estado: `UPDATE usuarios SET mfa_enabled = false WHERE email = '...'`.

### Token JWT

| Propriedade | Valor |
|---|---|
| Algoritmo | HS256 |
| Derivação da chave | `Keys.hmacShaKeyFor(secret.getBytes(UTF_8))` |
| Subject | e-mail canônico do banco |
| Issuer | `ACLP-TJBA-Render` |
| Validade do access token | 24 h (`86400000` ms) |
| Validade do refresh token | 7 dias (`604800000` ms) |

### Cookies

Emitidos em [`AuthController`](../../aclp_back/src/main/java/br/jus/tjba/aclp/controller/AuthController.java):

| Cookie | Path | Flags | Validade |
|---|---|---|---|
| `auth-token` | `/` | `HttpOnly`, `Secure`, `SameSite=Lax` | 24 h |
| `refresh-token` | `/api/auth` | `HttpOnly`, `Secure`, `SameSite=Lax` | 7 dias |

Decisões relevantes:

- **Sem atributo `Domain`** — cookie *host-only*, gravado no domínio da Vercel. É o que permite ao middleware lê-lo.
- **`HttpOnly`** — invisível para JavaScript. Um XSS não consegue exfiltrar o token.
- **`refresh-token` restrito a `/api/auth`** — não trafega em requisição comum, reduzindo a superfície de exposição.
- **`SameSite=Lax`** — é a proteção CSRF desta arquitetura (o CSRF do Spring está desabilitado, coerente com a política *stateless*).

O frontend não guarda token em JavaScript. O sinal de "há sessão" é o perfil do usuário em `localStorage` (`user-data`), que **não é credencial** — forjá-lo não dá acesso a nada, porque quem decide é o backend.

### Middleware do frontend

[`middleware.ts`](../middleware.ts) protege `/dashboard/**` verificando o JWT **na borda**, antes de renderizar:

- Valida assinatura HS256 com Web Crypto e confere `exp`.
- **Fixa o algoritmo em HS256** e nunca usa o campo `alg` do cabeçalho para escolher a verificação — é assim que se evita *algorithm confusion* (`alg: none`, troca HS/RS).
- **Fail-closed:** sem `JWT_SECRET` configurado, bloqueia o acesso e registra erro. Não degrada para "deixa passar".

> Se o `JWT_SECRET` da Vercel divergir do Render, o sintoma é: login retorna 200, mas `/dashboard` redireciona para `/login` num laço.

### Papéis

| Papel | Enum | Alcance |
|---|---|---|
| Administrador | `ADMIN` | Tudo, incluindo usuários, convites e operações destrutivas |
| Usuário | `USUARIO` | Consulta e registro de comparecimentos |

Regras em [`SecurityConfig`](../../aclp_back/src/main/java/br/jus/tjba/aclp/config/SecurityConfig.java) mais `@PreAuthorize("hasRole('ADMIN')")` nos métodos sensíveis: exclusões, suspensão/reativação de processo, verificação em massa de inadimplentes e migrações.

### Cabeçalhos de segurança

Aplicados a todas as rotas pelo [`next.config.ts`](../next.config.ts):

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;
  connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

`'unsafe-inline'`/`'unsafe-eval'` em `script-src` são exigidos pelo runtime do Next sem *plumbing* de nonce — é uma concessão conhecida. O ganho concreto está em `connect-src`, `frame-ancestors`, `object-src` e `form-action`.

---

## 5. Modelo de domínio

```
Usuario ──┐
          ├─ registra ─→ HistoricoComparecimento
Custodiado ──1:N─→ Processo ──1:N─→ HistoricoComparecimento
     │
     └──1:N─→ HistoricoEndereco
```

| Entidade | Papel |
|---|---|
| `Usuario` | Servidor do TJBA. Tipos `ADMIN` / `USUARIO` |
| `Custodiado` | Pessoa sob medida cautelar. Identificada externamente por `publicId` |
| `Processo` | Processo judicial (número CNJ), periodicidade e datas de comparecimento |
| `HistoricoComparecimento` | Cada validação registrada |
| `HistoricoEndereco` | Trilha de mudanças de endereço |
| `Convite` | Convite de acesso, com token e expiração |
| `PreCadastro` / `EmailVerification` | Fluxo de verificação de e-mail por código |
| `RefreshToken` | Refresh tokens persistidos |
| `LoginAttempt` | Auditoria de tentativas (base do rate limiting) |
| `SetupStatus` | Marca a conclusão do setup inicial |

### Enums

| Enum | Valores |
|---|---|
| `TipoUsuario` | `ADMIN`, `USUARIO` |
| `StatusUsuario` | `INVITED`, `ACTIVE`, `INACTIVE`, `BLOCKED`, `EXPIRED` |
| `StatusCustodiado` / `SituacaoCustodiado` | `ATIVO`, `ARQUIVADO` |
| `SituacaoProcesso` | `ATIVO`, `ENCERRADO`, `SUSPENSO` |
| `StatusComparecimento` | `EM_CONFORMIDADE`, `INADIMPLENTE` |
| `TipoValidacao` | `presencial`, `online`, `cadastro_inicial` |
| `StatusConvite` | `PENDENTE`, `ATIVADO`, `EXPIRADO`, `CANCELADO` |
| `EstadoBrasil` | 27 UFs com sigla, nome e região |

> **Nota:** `StatusCustodiado` e `SituacaoCustodiado` têm valores idênticos. É duplicação a consolidar.

---

## 6. Parâmetros de cadastro

Esta seção é a referência normativa dos formulários. Todas as validações são declaradas via *Bean Validation* nos DTOs e aplicadas no servidor — o frontend replica parte delas, mas **o servidor é a autoridade**.

### 6.0 Política de senha (única)

Vale para **todas** as portas de entrada: setup inicial, ativação por convite, cadastro direto de usuário, troca de senha do perfil e redefinição por token. As constantes ficam em [`PoliticaSenha`](../../aclp_back/src/main/java/br/jus/tjba/aclp/dto/PoliticaSenha.java) e são referenciadas pelas anotações — é isso que impede as regras de divergirem de novo.

| Regra | Valor |
|---|---|
| Tamanho | 8 a 100 caracteres |
| Composição | ≥1 minúscula, ≥1 maiúscula, ≥1 dígito, ≥1 caractere não alfanumérico |
| Alfabeto | **Sem restrição** — qualquer caractere é aceito |
| Regex | `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$` |

Não há lista branca de símbolos: restringir o alfabeto reduziria o espaço de busca sem ganho de segurança e reprovaria senhas legítimas como `Senha_2026`. `AuthService.validatePasswordStrength` espelha as mesmas regras, mas com mensagem por item, para dizer **qual** requisito falhou.

### 6.1 Cadastro inicial de custodiado

`POST /api/custodiados/cadastro-inicial` — [`CadastroInicialDTO`](../../aclp_back/src/main/java/br/jus/tjba/aclp/dto/CadastroInicialDTO.java)

Operação **unificada**: cria em uma única transação o Custodiado, o Endereço, o Processo e o primeiro Comparecimento.

#### 1. Dados pessoais

| Campo | Tipo | Obrigatório | Regra | Normalização |
|---|---|---|---|---|
| `nome` | string | **Sim** | 2 a 150 caracteres | `trim` + **MAIÚSCULAS** |
| `contato` | string | Não | Só dígitos e `( ) . -` | `trim`; se vazio grava `"Pendente"` |

#### 2. Documentos

| Campo | Tipo | Obrigatório | Regra | Normalização |
|---|---|---|---|---|
| `cpf` | string | Condicional | `000.000.000-00` ou 11 dígitos | `trim` |
| `rg` | string | Condicional | Máx. 20 caracteres | `trim` + MAIÚSCULAS |

> **Regra composta:** pelo menos um entre `cpf` e `rg` deve vir preenchido. Violação retorna *"Pelo menos CPF ou RG deve ser informado"*.

#### 3. Dados processuais

| Campo | Tipo | Obrigatório | Regra | Normalização |
|---|---|---|---|---|
| `processo` | string | **Sim** | **CNJ**: `0000000-00.0000.0.00.0000` | `trim` |
| `vara` | string | **Sim** | Máx. 100 caracteres | `trim` + MAIÚSCULAS |
| `comarca` | string | **Sim** | Máx. 100 caracteres | `trim` + MAIÚSCULAS |
| `dataDecisao` | date | **Sim** | `yyyy-MM-dd` | — |
| `dataComparecimentoInicial` | date | Não | `yyyy-MM-dd` | — |

#### 4. Periodicidade

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `periodicidade` | integer | **Sim** | 1 a 365 (**dias**) |

#### 5. Endereço

| Campo | Tipo | Obrigatório | Regra | Normalização |
|---|---|---|---|---|
| `cep` | string | **Sim** | `00000-000` ou 8 dígitos | Reduzido a **só dígitos** |
| `logradouro` | string | **Sim** | 5 a 200 caracteres | `trim` |
| `numero` | string | Não | Máx. 20 caracteres | `trim` |
| `complemento` | string | Não | Máx. 100 caracteres | `trim` |
| `bairro` | string | **Sim** | 2 a 100 caracteres | `trim` |
| `cidade` | string | **Sim** | 2 a 100 caracteres | `trim` |
| `estado` | string | **Sim** | Exatamente 2 letras maiúsculas | `trim` + MAIÚSCULAS |

#### 6. Observações

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `observacoes` | string | Não | Máx. 500 caracteres |

#### Exemplo

```json
{
  "nome": "João da Silva",
  "contato": "(71) 99999-9999",
  "cpf": "123.456.789-00",
  "rg": "1234567890",
  "processo": "0000001-11.2024.8.05.0001",
  "vara": "1ª Vara Criminal",
  "comarca": "Rio Real",
  "dataDecisao": "2024-01-15",
  "dataComparecimentoInicial": "2024-02-01",
  "periodicidade": 30,
  "cep": "48730-000",
  "logradouro": "Rua das Flores",
  "numero": "100",
  "complemento": "Apto 2",
  "bairro": "Centro",
  "cidade": "Rio Real",
  "estado": "BA",
  "observacoes": "Comparecimento mensal."
}
```

### 6.2 Cadastro de custodiado (formato estrito)

`POST /api/custodiados` — [`CustodiadoCreateDTO`](../../aclp_back/src/main/java/br/jus/tjba/aclp/dto/CustodiadoCreateDTO.java)

Mesmos campos do cadastro inicial, com **duas diferenças**:

| Campo | Cadastro inicial | Cadastro estrito |
|---|---|---|
| `contato` | Opcional; vira `"Pendente"` | **Obrigatório**, formato de telefone `(00) 00000-0000` |
| `dataComparecimentoInicial` | Opcional | **Obrigatória** |

O `nome` aqui **não** é convertido para maiúsculas.

O formato do número de processo é o mesmo nas duas rotas (CNJ). O formulário do frontend já aplica a máscara e exige os 20 dígitos.

### 6.3 Cadastro de processo

`POST /api/processos` — [`ProcessoDTO`](../../aclp_back/src/main/java/br/jus/tjba/aclp/dto/ProcessoDTO.java)

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `custodiadoId` | long | **Sim** | Custodiado existente |
| `numeroProcesso` | string | **Sim** | CNJ: `0000000-00.0000.0.00.0000` |
| `vara` | string | **Sim** | Máx. 100 |
| `comarca` | string | **Sim** | Máx. 100 |
| `dataDecisao` | date | **Sim** | `yyyy-MM-dd`; **não pode ser futura** |
| `periodicidade` | integer | **Sim** | 1 a 365 dias |
| `dataComparecimentoInicial` | date | **Sim** | `yyyy-MM-dd` |
| `observacoes` | string | Não | Máx. 500 |

### 6.4 Registro de comparecimento

`POST /api/comparecimentos/registrar` — [`ComparecimentoDTO`](../../aclp_back/src/main/java/br/jus/tjba/aclp/dto/ComparecimentoDTO.java)

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `processoId` | long | **Sim*** | Referência preferencial |
| `custodiadoId` | long | *(deprecated)* | Mantido por compatibilidade |
| `dataComparecimento` | date | **Sim** | `yyyy-MM-dd` |
| `horaComparecimento` | time | Não | `HH:mm:ss` |
| `tipoValidacao` | enum | **Sim** | `presencial` \| `online` \| `cadastro_inicial` |
| `validadoPor` | string | **Sim** | Máx. 100. Nome do servidor responsável |
| `observacoes` | string | Não | Máx. 500 |
| `anexos` | string | Não | Máx. 1000 |
| `mudancaEndereco` | boolean | Não | Padrão `false` |
| `motivoMudancaEndereco` | string | Não | Máx. 500 |
| `novoEndereco` | objeto | Condicional | **Obrigatório se `mudancaEndereco = true`** |

\* Ao menos um entre `processoId` e `custodiadoId`; `processoId` tem precedência.

O objeto `novoEndereco` segue exatamente as mesmas regras da seção 6.1.5.

### 6.5 Setup do administrador inicial

`POST /api/setup/admin` — [`SetupAdminDTO`](../../aclp_back/src/main/java/br/jus/tjba/aclp/dto/SetupAdminDTO.java)

Endpoint público de **uso único**, disponível apenas enquanto não há usuário cadastrado.

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `nome` | string | **Sim** | 3 a 150; só letras, espaços e `' . -`; **mínimo 2 palavras** |
| `email` | string | **Sim** | Válido, máx. 150, **obrigatoriamente `@tjba.jus.br`** |
| `senha` | string | **Sim** | Política única — ver 6.0 |
| `confirmaSenha` | string | **Sim** | Deve ser idêntica a `senha` |
| `departamento` | string | Não | Máx. 100 |
| `telefone` | string | Não | Máx. 20, formato `(71) 99999-9999` |

O e-mail é normalizado com `trim().toLowerCase()`.

### 6.6 Convite e ativação de conta

**Criar convite** — `POST /api/usuarios/convites` *(ADMIN)* — [`CriarConviteRequest`](../../aclp_back/src/main/java/br/jus/tjba/aclp/dto/convite/CriarConviteRequest.java)

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `email` | string | **Sim** | E-mail válido, ainda não cadastrado |
| `tipoUsuario` | enum | **Sim** | `ADMIN` \| `USUARIO` |

**Ativar convite** — `POST /api/usuarios/convites/ativar` *(público)* — [`AtivarConviteRequest`](../../aclp_back/src/main/java/br/jus/tjba/aclp/dto/convite/AtivarConviteRequest.java)

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `token` | string | **Sim** | Token recebido por e-mail |
| `nome` | string | **Sim** | — |
| `senha` | string | **Sim** | Política única — ver 6.0 |
| `confirmaSenha` | string | **Sim** | Idêntica a `senha` |
| `telefone` | string | Não | — |
| `cargo` | string | Não | — |

### 6.7 Cadastro direto de usuário

`POST /api/usuarios` *(ADMIN)* — [`UsuarioDTO`](../../aclp_back/src/main/java/br/jus/tjba/aclp/dto/UsuarioDTO.java)

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `nome` | string | **Sim** | — |
| `email` | string | **Sim** | E-mail válido |
| `senha` | string | **Sim** | Política única — ver 6.0 |
| `tipo` | enum | **Sim** | `ADMIN` \| `USUARIO` |
| `departamento` / `comarca` / `cargo` | string | Não | — |
| `ativo` | boolean | Não | — |

### 6.8 Comportamento de e-mail

A busca de usuário por e-mail é **case-insensitive** — `UsuarioRepository.findByEmail` usa `LOWER(u.email) = LOWER(:email)`. `existsByEmail`, `existsByEmailAndIdNot` e `findByEmailAndAtivoFalse` seguem a mesma normalização, para que a checagem de duplicidade não deixe passar pares como `a@x` / `A@x`.

Recomendado no banco: índice único sobre `LOWER(email)`, para o próprio Postgres garantir a unicidade.

---

## 7. Endpoints

### Públicos (sem autenticação)

| Método | Rota | Função |
|---|---|---|
| POST | `/api/auth/login` | Autenticar |
| POST | `/api/auth/refresh` | Renovar sessão via cookie |
| POST | `/api/auth/forgot-password` | Solicitar redefinição |
| POST | `/api/auth/reset-password` | Redefinir com token |
| GET | `/api/auth/validate` | Validar token |
| GET | `/api/auth/health` | Saúde do módulo de auth |
| GET | `/api/setup/status` | Estado do setup inicial |
| POST | `/api/setup/admin` | Criar admin inicial |
| GET | `/api/setup/health` | Saúde da aplicação |
| GET | `/api/usuarios/convites/validar/{token}` | Validar convite |
| POST | `/api/usuarios/convites/ativar` | Ativar conta |

### Autenticados

| Método | Rota | Função |
|---|---|---|
| POST | `/api/auth/logout` | Encerrar sessão |
| GET | `/api/auth/me` | Perfil corrente |
| GET | `/api/auth/sessions` | Sessões ativas |
| DELETE | `/api/auth/sessions/{id}` | Encerrar sessão específica |
| POST | `/api/auth/change-password` | Trocar senha |
| GET | `/api/custodiados` | Listar (paginado: `page`, `size`) |
| GET | `/api/custodiados/{publicId}` | Detalhe |
| GET | `/api/custodiados/buscar` | Busca |
| GET | `/api/custodiados/inadimplentes` | Inadimplentes |
| GET | `/api/custodiados/comparecimentos/hoje` | Agenda do dia |
| GET | `/api/custodiados/exportar` | Exportação com filtros |
| POST | `/api/custodiados` | Criar |
| POST | `/api/custodiados/cadastro-inicial` | Criar (fluxo unificado) |
| PUT | `/api/custodiados/{publicId}` | Atualizar |
| GET | `/api/processos` | Listar |
| GET | `/api/processos/contadores` | Contadores do dashboard |
| POST | `/api/processos` | Criar |
| POST | `/api/processos/batch` | Busca em lote |
| PUT | `/api/processos/{id}` | Atualizar |
| POST | `/api/comparecimentos/registrar` | Registrar comparecimento |
| GET | `/api/comparecimentos/todos` | Listar com filtros |
| GET | `/api/comparecimentos/estatisticas` | Estatísticas |
| PUT | `/api/comparecimentos/{id}/observacoes` | Editar observações |

### Exclusivos de ADMIN

| Método | Rota | Função |
|---|---|---|
| DELETE | `/api/custodiados/{publicId}` | Excluir custodiado |
| DELETE | `/api/processos/{id}` | Excluir processo |
| POST | `/api/processos/{id}/suspender` | Suspender processo |
| POST | `/api/processos/{id}/reativar` | Reativar processo |
| POST | `/api/comparecimentos/verificar-inadimplentes` | Verificação em massa |
| POST | `/api/comparecimentos/migrar/cadastros-iniciais` | Migração de dados |
| GET/POST/PUT/DELETE | `/api/usuarios/**` | Gestão de usuários |
| POST | `/api/usuarios/convites` | Criar convite |
| DELETE | `/api/usuarios/convites/{id}` | Cancelar convite |
| POST | `/api/usuarios/convites/{id}/reenviar` | Reenviar convite |
| GET | `/api/usuarios/convites/stats` | Estatísticas de convites |

---

## 8. Frontend

### Rotas

| Rota | Acesso | Função |
|---|---|---|
| `/` | Público | Redireciona conforme sessão |
| `/login` | Público | Autenticação |
| `/invite/[token]` | Público | Aceite de convite |
| `/cadastro/[token]` | Público | Cadastro via token |
| `/ativar-conta` | Público | Ativação de conta |
| `/dashboard` | Protegido | Painel principal |
| `/dashboard/geral` | Protegido | Visão consolidada |
| `/dashboard/registrar` | Protegido | Cadastro de custodiado |
| `/dashboard/buscar` | Protegido | Busca |
| `/dashboard/custodiado/[id]` | Protegido | Ficha do custodiado |
| `/dashboard/comparecimento/confirmar` | Protegido | Registro de comparecimento |
| `/dashboard/historicoComparecimento` | Protegido | Histórico |
| `/dashboard/historicoComparecimento/enderecos/[id]` | Protegido | Histórico de endereços |
| `/dashboard/configuracoes` | Protegido | Configurações |

### Cliente HTTP

[`lib/http/client.ts`](../lib/http/client.ts) centraliza todas as chamadas:

- `baseURL` = `NEXT_PUBLIC_API_URL` (padrão `/api`)
- `credentials: 'include'` em toda requisição — o cookie de sessão acompanha
- Timeout de 60 s, 3 tentativas com *backoff*
- **Refresh automático:** ao receber 401, chama `/auth/refresh` e repete a requisição original. Requisições concorrentes entram em fila (`failedQueue`) e são liberadas juntas — evita uma rajada de refreshes simultâneos
- Lista de rotas públicas que não exigem sessão prévia

---

## 9. Deploy

### Frontend (Vercel)

Build automático a cada push. Depois de alterar variáveis de ambiente é **obrigatório** um redeploy — `NEXT_PUBLIC_*` e `rewrites()` são resolvidos em build time.

### Backend (Render)

Build via `Dockerfile`, perfil `render`. O plano free hiberna após inatividade; o `ACLP_SELF_PING_ENABLED` mitiga isso. A primeira requisição após hibernação pode levar dezenas de segundos — o timeout de 60 s do cliente HTTP foi dimensionado para isso.

### Checklist de publicação

1. `NEXT_PUBLIC_API_URL=/api` na Vercel (ambiente **Production**)
2. `BACKEND_URL=https://aclp-back.onrender.com` na Vercel, sem `/api` no final
3. `JWT_SECRET` **idêntico** em Vercel e Render
4. Redeploy do frontend após qualquer alteração de variável
5. Verificar `GET /api/setup/status` respondendo 200
6. Testar login ponta a ponta e a permanência em `/dashboard`

---

## 10. Diagnóstico rápido

| Sintoma | Causa provável |
|---|---|
| `TypeError: Failed to fetch` + menção a CSP | `NEXT_PUBLIC_API_URL` apontando para host externo. Deve ser `/api` |
| `404` em `/api/...` no domínio da Vercel | `BACKEND_URL` ausente ou com nome errado. Não é `NEXT_PUBLIC_BACKEND_URL` |
| `401` com `{"success":false,"message":"Credenciais inválidas"}` | Resposta legítima do backend: e-mail inexistente ou senha incorreta |
| Login 200, mas `/dashboard` volta para `/login` | `JWT_SECRET` divergente entre Vercel e Render, ou ausente na Vercel |
| "Muitas tentativas. Aguarde..." | Rate limit por IP: mais de 10 tentativas em 1 minuto |
| "Conta bloqueada. Tente novamente em N minutos" | 5 falhas de senha. Bloqueio de 30 minutos |
| "Autenticação multifator está habilitada nesta conta..." | `mfa_enabled = true` numa conta. MFA não existe: desativar a coluna |
| Aplicação não sobe com `IllegalStateException` sobre MFA | `aclp.auth.mfa-enabled=true`. Definir como `false` |
| Primeira requisição do dia muito lenta | Hibernação do plano free do Render |

### Redefinir senha diretamente no banco

Com `pgcrypto` (disponível no Supabase):

```sql
UPDATE usuarios
SET senha = crypt('NovaSenha@2026', gen_salt('bf', 10)),
    tentativas_login_falhadas = 0,
    bloqueado_ate = NULL
WHERE email = 'usuario@tjba.jus.br';
```

`gen_salt('bf', 10)` gera hash `$2a$10$...`, formato aceito pelo `BCryptPasswordEncoder`. Se a função não for encontrada, use `extensions.crypt(...)` / `extensions.gen_salt(...)`.

---

## 11. Pendências técnicas conhecidas

| Item | Descrição | Impacto |
|---|---|---|
| `StatusCustodiado` × `SituacaoCustodiado` | Enums duplicados com valores idênticos | Baixo — confusão de manutenção |
| MFA não implementado | Fluxo está fail-closed e documentado, mas o recurso não existe | Baixo — nenhuma conta em produção usa |
| `'unsafe-inline'`/`'unsafe-eval'` na CSP | Exigidos pelo Next sem nonce | Médio — reduz a proteção contra XSS |
| Sem índice único em `LOWER(email)` | A unicidade depende só da checagem em aplicação | Médio — corrida pode gerar duplicata |

### Corrigido nesta revisão

| Item | O que era | O que passou a ser |
|---|---|---|
| Política de senha | Setup exigia composição forte; convite exigia 8 caracteres; troca de senha do perfil aceitava 6 — valia sempre a mais fraca | Política única em `PoliticaSenha`, referenciada por todos os DTOs (ver 6.0). Frontend alinhado nas telas de convite, ativação e configurações |
| Formato de processo | `cadastro-inicial` aceitava `[\d.-]+`; demais exigiam CNJ | CNJ em todas as rotas |
| MFA | `mfa_enabled = true` levava a `UnsupportedOperationException` e erro genérico, trancando o usuário sem explicação | Falha na subida se a propriedade global for ligada; no login, recusa com mensagem acionável |
