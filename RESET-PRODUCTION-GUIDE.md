# 🔧 Guia para Resetar Banco de Produção

Este guia explica como limpar o banco de produção e subir apenas com dados essenciais.

## 📋 Situação Atual

- ✅ Replit separa **automaticamente** bancos de desenvolvimento e produção
- 🔴 **Problema**: Dados de teste do desenvolvimento foram para produção no primeiro deploy
- ✅ **Solução**: Script de reset disponível para limpar e recriar dados essenciais

---

## 🚀 Como Executar o Reset em Produção

### Passo 1: Acessar o Deployment

1. No Replit, abra seu projeto
2. Clique na aba **"Deployments"** (ícone de foguete)
3. Clique no deployment ativo
4. Clique em **"Open Shell"** ou **"Console"**

### Passo 2: Executar o Script de Reset

No console do deployment, execute:

```bash
npx tsx server/reset-production.ts
```

**⚠️ ATENÇÃO:**
- Este comando DELETA TODOS OS DADOS do banco de produção
- O script tem proteção: se `NODE_ENV=production`, ele bloqueia execução
- Se bloqueado, remova temporariamente a variável `NODE_ENV` antes de executar

### Passo 3: Aguardar Conclusão

O script irá:
1. ✅ Deletar todos os dados existentes (respeitando foreign keys)
2. ✅ Criar usuário admin (username: admin, password: 123456)
3. ✅ Criar branch matriz
4. ✅ Criar 4 métodos de pagamento padrão
5. ✅ Criar 4 métodos de envio padrão
6. ✅ Criar configurações de comissão padrão

### Passo 4: Testar Acesso

Após o reset, teste o login:

- **URL**: `https://seu-deployment.replit.app`
- **Usuário**: `admin`
- **Senha**: `123456`

---

## 🎯 O Que Será Deletado

O script remove TODOS os dados:
- ❌ Todos os usuários (exceto admin que será recriado)
- ❌ Todos os clientes, vendedores, produtores
- ❌ Todos os pedidos e ordens de produção
- ❌ Todos os pagamentos e comissões
- ❌ Todos os orçamentos e produtos
- ❌ Dados de teste, contas a receber/pagar, etc.

## ✅ O Que Será Criado

Apenas dados essenciais para funcionamento:
- ✅ 1 usuário admin (admin/123456)
- ✅ 1 branch matriz (São Paulo)
- ✅ 4 métodos de pagamento (PIX, Cartão, Boleto, Transferência)
- ✅ 4 métodos de envio (PAC, SEDEX, Própria, Retirada)
- ✅ Configurações de comissão padrão (10% vendedor, 15% parceiro)

---

## 🔒 Separação Desenvolvimento vs Produção

### Como Funciona Automaticamente

O Replit gerencia automaticamente:

| Ambiente | Banco | Quando Usa |
|----------|-------|------------|
| **Desenvolvimento** | `DATABASE_URL` do workspace | Quando você trabalha no código |
| **Produção** | `DATABASE_URL` do deployment | Quando app está publicado |

### ⚠️ Importante

- **Estrutura** (schema): Sincronizada automaticamente via `npm run db:push`
- **Dados**: NÃO são sincronizados automaticamente
- **Seeding**: Deve ser executado manualmente em produção se necessário

### Boas Práticas

1. **Desenvolvimento**: Pode criar quantos dados de teste quiser
2. **Produção**: Após reset, só adicione dados reais via interface
3. **Migrations**: Sempre use `npm run db:push` (nunca SQL manual)
4. **Seeds**: Use `npx tsx server/seed.ts` apenas em banco vazio

---

## 🛠️ Scripts Disponíveis

Execute no terminal do Replit:

```bash
# Popular banco vazio com dados essenciais (protegido, só roda se vazio)
npx tsx server/seed.ts

# Resetar banco e recriar dados essenciais (USE COM CAUTELA!)
npx tsx server/reset-production.ts

# Sincronizar estrutura do banco com o schema (após mudanças no código)
npm run db:push

# Forçar sincronização (se houver conflitos)
npm run db:push -- --force
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique que está executando no console correto (dev vs prod)
2. Confirme que `DATABASE_URL` está configurado
3. Verifique logs do script para mensagens de erro
4. Se necessário, entre em contato com suporte do Replit

---

## ✅ Checklist Pós-Reset

Após executar o reset em produção:

- [ ] Login com admin funciona (admin/123456)
- [ ] Painel administrativo carrega corretamente
- [ ] Cadastro de vendedores funciona
- [ ] Cadastro de clientes funciona
- [ ] Página `/clientes` (registro público) funciona
- [ ] Métodos de pagamento aparecem corretamente
- [ ] Métodos de envio aparecem corretamente

---

**Última atualização**: 29 de outubro de 2025
