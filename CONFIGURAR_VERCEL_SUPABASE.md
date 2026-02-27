# Guia de Configuração: Vercel + Supabase

## 📋 Pré-requisitos

- Conta no [Vercel](https://vercel.com)
- Conta no [Supabase](https://supabase.com)
- Projeto Nexo Brindes configurado localmente

---

## 🚀 Passo 1: Criar Projeto no Supabase

1. **Acesse** [supabase.com](https://supabase.com) e faça login
2. **Clique em "New Project"**
3. **Preencha os dados:**
   - **Name:** `nexo-brindes` (ou nome desejado)
   - **Database Password:** Anote esta senha! Você precisará dela depois
   - **Region:** Escolha `South America (São Paulo)` para melhor latência
   - **Pricing Plan:** Free tier (até 500MB)

4. **Aguarde** a criação do projeto (pode levar 1-2 minutos)

---

## 🗄️ Passo 2: Obter String de Conexão

1. No painel do Supabase, vá para **Project Settings** (ícone de engrenagem)
2. **Clique em "Database"** no menu lateral
3. Role para baixo até a seção **"Connection string"**
4. **Selecione "URI"** (primeira opção)
5. **Copie** a string de conexão.

### 🔄 Duas Opções de Conexão:

#### **Opção A: Connection Pooling (RECOMENDADO para Vercel)**
Para aplicações serverless como Vercel, use **Connection Pooling** (porta 6543):
```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-west-2.pooler.supabase.com:6543/postgres
```

#### **Opção B: Conexão Direta**
Conexão direta ao banco (porta padrão 5432):
```
postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

### ⚠️ **IMPORTANTE: Cuidado com Colchetes!**
- Os colchetes `[ ]` são **apenas placeholders** na documentação
- **NÃO** inclua colchetes na senha real
- Exemplo **CORRETO**: `postgresql://postgres.chdmycfidnsgvrpsndta:SUA_SENHA@aws-0-us-west-2.pooler.supabase.com:6543/postgres`
- Exemplo **ERRADO**: `postgresql://postgres.chdmycfidnsgvrpsndta:[SUA_SENHA]@aws-0-us-west-2.pooler.supabase.com:6543/postgres`

### 🔐 SSL (Obrigatório para Supabase)
O Supabase requer SSL. Nosso código já configura `ssl: { rejectUnauthorized: false }` automaticamente.
Não é necessário adicionar `?sslmode=require` manualmente.

---

## ⚙️ Passo 3: Configurar Variáveis de Ambiente no Vercel

### Método A: Via Painel Web (Recomendado)

1. **Acesse** [vercel.com](https://vercel.com) e selecione seu projeto
2. Vá para **Settings > Environment Variables**
3. **Adicione as seguintes variáveis:**

| Nome | Valor | Observação |
|------|-------|------------|
| `DATABASE_URL` | `postgresql://postgres.[PROJECT-REF]:SUA_SENHA@aws-0-us-west-2.pooler.supabase.com:6543/postgres` | **Substitua** `[PROJECT-REF]` e `SUA_SENHA` |
| `JWT_SECRET` | `sua-chave-secreta-32-caracteres-aqui` | **Use** a mesma do `.env` local ou gere uma nova |
| `NODE_ENV` | `production` | **Obrigatório** para produção |

**Exemplo baseado na sua URL:**
```
postgresql://postgres.chdmycfidnsgvrpsndta:ATtcmqmnckpWoN8e@aws-0-us-west-2.pooler.supabase.com:6543/postgres
```

4. **Clique em "Save"** para salvar as variáveis

### Método B: Via CLI Vercel

```bash
# Instale o Vercel CLI se ainda não tiver
npm i -g vercel

# Configure as variáveis
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add NODE_ENV production
```

---

## 📦 Passo 4: Executar Migrações no Supabase

### 🔍 Primeiro: Verificar Estado Atual

Antes de executar migrações, verifique se as tabelas já existem:

```bash
# Configure a URL do Supabase
export DATABASE_URL="postgresql://postgres.chdmycfidnsgvrpsndta:ATtcmqmnckpWoN8e@aws-0-us-west-2.pooler.supabase.com:6543/postgres"

# Ou no PowerShell:
$env:DATABASE_URL="postgresql://postgres.chdmycfidnsgvrpsndta:ATtcmqmnckpWoN8e@aws-0-us-west-2.pooler.supabase.com:6543/postgres"

# Verifique as tabelas
node scripts/check-database.js
```

**Resultado esperado:** O banco já deve ter ~28 tabelas. Se faltarem tabelas, execute migrações.

### Opção A: Usando Drizzle Kit (Recomendado)

1. **Configure** o arquivo `.env` local com a string do Supabase:
   ```env
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:SUA_SENHA@aws-0-us-west-2.pooler.supabase.com:6543/postgres"
   ```

2. **Execute** as migrações (apenas se necessário):
   ```bash
   npx drizzle-kit push
   ```

3. **Verifique** novamente:
   ```bash
   node scripts/check-database.js
   ```

### Opção B: Via SQL direto (Migrações Manuais)

1. No Supabase, vá para **SQL Editor**
2. **Execute as migrações em ordem numérica**:
   - **0000_confused_ultimatum.sql**: Schema base completo
   - **0001_fix_budget_order_numbers.sql**: Correções de números de orçamento
   - **0002_add_client_commercial_fields.sql**: Campos comerciais de clientes
   - **0003_add_billing_delivery_addresses.sql**: Endereços de faturamento e entrega
3. **Para cada arquivo**:
   - Abra o arquivo em `migrations/nome_do_arquivo.sql`
   - Copie todo o conteúdo
   - Cole no SQL Editor do Supabase
   - Clique em **"Run"**

---

## 👤 Passo 5: Criar Usuário Administrador

Após criar as tabelas, você precisa criar um usuário administrador para acessar o sistema.

### Opção A: Usando Script Node.js (Recomendado)

```bash
# Configure a URL do Supabase no arquivo .env.supabase (já feito)
# Execute o script de criação do usuário admin
node scripts/create-admin.js
```

**Resultado esperado:**
```
✅ Usuário admin criado com sucesso!
   Usuário: admin
   Senha: 123456
```

### Opção B: Via SQL direto no Supabase

1. No Supabase, vá para **SQL Editor**
2. **Copie e cole** o conteúdo do arquivo `migrations/0004_create_admin_user.sql`
3. **Execute** o script

### 🔑 Credenciais Padrão do Admin
- **Usuário:** `admin`
- **Senha:** `123456`
- **Email:** `admin@nexobrindes.com`
- **Role:** `admin`

### ⚠️ Importante sobre Segurança
- A senha está em **texto plano** (sistema atual não usa hash)
- Para produção, **considere implementar hash de senhas**
- Você pode alterar a senha posteriormente no banco de dados

---

## 🚢 Passo 6: Fazer Deploy no Vercel

### Método A: Push para Git (Recomendado)

```bash
# Commit das mudanças
git add .
git commit -m "Migração para Supabase concluída"

# Push para o repositório
git push origin main

# O Vercel fará deploy automaticamente
```

### Método B: Deploy Manual via CLI

```bash
# Build local (opcional)
npm run build

# Deploy
vercel --prod
```

---

## ✅ Passo 7: Testar a Aplicação

### Testes de Conexão

#### Teste Local (Recomendado antes do deploy)
1. **Inicie o servidor local** com as variáveis do Supabase:
   ```bash
   $env:DATABASE_URL="postgresql://postgres.[PROJECT-REF]:SUA_SENHA@aws-0-us-west-2.pooler.supabase.com:6543/postgres"
   $env:JWT_SECRET="sua-chave-secreta"
   npm run dev
   ```

2. **Teste o login** com o script automatizado:
   ```bash
   node scripts/test-login.js
   ```
   **Resultado esperado:** `✅ Login bem-sucedido!`

3. **Teste manual** via navegador/postman:
   - **URL:** `http://localhost:5000/api/auth/login`
   - **Método:** POST
   - **Body:** `{"username": "admin", "password": "123456"}`

#### Teste no Vercel (após deploy)
1. **Acesse** sua aplicação: `https://seu-projeto.vercel.app`
2. **Faça login** com:
   - **Email:** `admin@nexobrindes.com`
   - **Senha:** `123456`

3. **Verifique os logs** no Vercel:
   - Vá para **Deployments > [último deploy] > Logs**
   - Procure por: `🔌 Pool de conexões PostgreSQL/Supabase inicializado com sucesso`

### Teste de Banco de Dados

```bash
# Configure a DATABASE_URL no ambiente de produção
export DATABASE_URL="sua-string-do-supabase"

# Execute o script de verificação
node scripts/check-database.js
```

---

## 🔧 Passo 8: Configurações Avançadas (Opcional)

### 1. Row Level Security (RLS) no Supabase
Para segurança adicional, ative RLS nas tabelas:

```sql
-- Exemplo para tabela users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Crie políticas específicas conforme necessário
```

### 2. Backups Automáticos
No Supabase, configure backups automáticos:
- **Project Settings > Database > Backups**
- **Frequência:** Diário
- **Retenção:** 7 dias (gratuito)

### 3. Monitoramento
- **Vercel Analytics:** Habilite em **Settings > Analytics**
- **Supabase Metrics:** Monitoramento em **Project Settings > Database > Health**

---

## 🚨 Solução de Problemas Comuns

### ❌ "Error: no pg_hba.conf entry for host"
**Causa:** IP não autorizado no Supabase.
**Solução:** No Supabase, vá para **Project Settings > Database > Connection Pooling** e adicione o IP do Vercel.

### ❌ "SSL/TLS required"
**Causa:** Conexão sem SSL.
**Solução:** Adicione `?sslmode=require` ao final da `DATABASE_URL`.

### ❌ "password authentication failed"
**Causa:** Senha incorreta.
**Solução:** Verifique a senha no Supabase **Project Settings > Database**.

### ❌ "relation 'users' does not exist"
**Causa:** Tabelas não migradas.
**Solução:** Execute `npx drizzle-kit push` com `DATABASE_URL` configurada.

### ❌ "Pool is closed"
**Causa:** Timeout de conexão.
**Solução:** Aumente `idleTimeoutMillis` no `server/pgClient.ts` (já configurado para 3 minutos).

---

## 📞 Suporte

### Links Úteis
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)

### Verificações Finais
- [ ] String de conexão copiada corretamente
- [ ] Variáveis configuradas no Vercel
- [ ] Migrações executadas
- [ ] Login funcionando
- [ ] Logs sem erros de conexão

---

## 🎉 Pronto!

Seu projeto Nexo Brindes agora está rodando com:
- ✅ **Banco de dados:** Supabase PostgreSQL
- ✅ **Hosting:** Vercel Serverless
- ✅ **API:** Express.js com Drizzle ORM
- ✅ **Frontend:** React com Vite

**Next Steps:**
1. Configure domínio customizado (opcional)
2. Habilite monitoramento e alertas
3. Configure backups regulares
4. Otimize para produção

---

*Última atualização: `date +%Y-%m-%d`*
*Versão do guia: 1.0*