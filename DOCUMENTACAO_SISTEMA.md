
# Documentação do Sistema ERP - Vendas e Produção Terceirizada

## 📋 Visão Geral do Sistema

Este é um sistema ERP (Enterprise Resource Planning) completo desenvolvido para gestão de vendas e produção terceirizada com controle financeiro integrado. O sistema é totalmente baseado na web e oferece diferentes painéis especializados para cada tipo de usuário, garantindo organização, agilidade e transparência em todas as etapas do processo.

### Características Principais
- **Sistema Web Completo**: Acessível via navegador
- **Multi-usuário**: Diferentes perfis de acesso com funcionalidades específicas
- **Vendas por Link**: Links exclusivos para vendedores
- **Automação de Pagamentos**: Confirmação automática com webhook (30% de sinal)
- **Produção Terceirizada**: Gestão completa de produtores externos
- **Controle Financeiro**: Importação OFX e conciliação bancária
- **Tempo Real**: Atualizações em tempo real via WebSockets

## 🛠️ Tecnologias Utilizadas

### Frontend
- **Framework**: React 18 com TypeScript
- **Build Tool**: Vite (para desenvolvimento rápido)
- **Roteamento**: Wouter (alternativa leve ao React Router)
- **Estilização**: 
  - Tailwind CSS (framework de CSS utilitário)
  - CSS Variables para temas customizáveis
- **Componentes UI**: 
  - shadcn/ui (biblioteca de componentes modernos)
  - Radix UI (primitivos acessíveis)
- **Fontes**: Google Fonts (Inter)

### Backend
- **Runtime**: Node.js com TypeScript
- **Framework**: Express.js
- **APIs**: REST APIs + WebSockets para atualizações em tempo real
- **Build Tool**: TSX para execução TypeScript

### Banco de Dados
- **SGBD**: PostgreSQL
- **Hosting**: Neon Database (serverless PostgreSQL)
- **ORM**: Prisma ORM para tipagem e migrations
- **Migrations**: Drizzle Kit

### Gerenciamento de Estado
- **Server State**: TanStack React Query (cache e sincronização)
- **Formulários**: React Hook Form com validação

### Integração Externa
- **Pagamentos**: Webhooks para confirmação automática
- **Bancário**: Importação de arquivos OFX
- **Deploy**: Replit (plataforma completa de desenvolvimento)

## 👥 Perfis de Usuário e Funcionalidades

### 🔧 Administrador Geral
**Acesso completo ao sistema com as seguintes funcionalidades:**

- **Gestão de Pedidos**:
  - Visualização de todos os pedidos
  - Envio de pedidos para produção
  - Controle de prazos e acompanhamento
  - Visão consolidada de vendas, produção e financeiro

- **Gestão de Usuários**:
  - Cadastro e gerenciamento de vendedores
  - Cadastro e gerenciamento de clientes
  - Cadastro e gerenciamento de produtores externos
  - Controle de acessos e permissões

- **Relatórios e Dashboard**:
  - Dashboard executivo com métricas principais
  - Relatórios de vendas e produção
  - Análise de performance

### 🛍️ Vendedor
**Painel focado em vendas e relacionamento com clientes:**

- **Gestão de Vendas**:
  - Geração de links exclusivos personalizados
  - Páginas de compra customizadas para cada link
  - Acompanhamento de pedidos originados pelo seu link

- **Relacionamento com Clientes**:
  - Lista de clientes cadastrados via seus links
  - Histórico de pedidos por cliente
  - Status detalhado de cada pedido

- **Comissões**:
  - Visualização de comissões previstas
  - Acompanhamento de comissões confirmadas
  - Relatórios de performance de vendas

### 👤 Cliente
**Interface simples para acompanhamento de pedidos:**

- **Acompanhamento de Pedidos**:
  - Linha do tempo detalhada do pedido
  - Status atual da produção
  - Detalhes do produto encomendado
  - Prazos de entrega atualizados

- **Transparência**:
  - Informações sobre o produtor responsável
  - Histórico de atualizações
  - Estimativas de prazo

### 🏭 Produtor Externo
**Painel para gestão da produção terceirizada:**

- **Ordens de Produção**:
  - Recebimento de ordens de produção
  - Sistema de aceite/recusa de ordens
  - Atualização de status de produção

- **Gestão de Prazos**:
  - Informação de prazos estimados
  - Atualizações de progresso
  - Registro de entregas

- **Documentação**:
  - Upload de anexos e comprovantes
  - Fotos do progresso da produção
  - Registro de retorno para conferência

### 💰 Financeiro
**Controle completo das finanças:**

- **Conciliação Bancária**:
  - Importação de extratos OFX
  - Conciliação automática de pagamentos
  - Conciliação manual quando necessário

- **Controle de Contas**:
  - Contas a receber
  - Contas a pagar
  - Fluxo de caixa

- **Comissões**:
  - Cálculo automático de comissões
  - Processamento de pagamentos para vendedores
  - Relatórios financeiros detalhados

## 🔄 Fluxo Principal do Sistema

### 1. Venda
1. Vendedor gera link exclusivo personalizado
2. Cliente acessa página de compra via link
3. Cliente faz pedido e efetua pagamento de 30% (sinal)
4. Webhook confirma pagamento automaticamente
5. Sistema cadastra automaticamente cliente e pedido
6. Pedido é associado ao vendedor responsável

### 2. Produção
1. Administrador recebe o pedido confirmado
2. Administrador envia ordem de produção para produtor externo
3. Produtor recebe notificação e aceita/recusa a ordem
4. Produtor atualiza status durante a produção
5. Produtor registra conclusão e entrega
6. Administrador confirma retorno para conferência

### 3. Financeiro
1. Sistema registra o pagamento do sinal (30%)
2. Financeiro importa extrato bancário (OFX)
3. Sistema faz conciliação automática
4. Pendências são resolvidas manualmente
5. Comissões são calculadas e processadas
6. Relatórios financeiros são gerados

## 📊 Funcionalidades Técnicas Avançadas

### Tempo Real
- **WebSockets**: Atualizações instantâneas de status
- **React Query**: Cache inteligente e sincronização
- **Notificações**: Sistema de notificações em tempo real

### Responsividade
- **Design Mobile-First**: Interface adaptável
- **Tailwind CSS**: Sistema de grid responsivo
- **Componentes Adaptativos**: UI que se ajusta automaticamente

### Performance
- **Lazy Loading**: Carregamento sob demanda
- **Code Splitting**: Divisão inteligente do código
- **Caching**: Cache estratégico de dados

### Segurança
- **Autenticação**: Sistema de login seguro
- **Autorização**: Controle de acesso baseado em roles
- **Validação**: Validação de dados no frontend e backend

## 🗂️ Estrutura do Projeto

```
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes reutilizáveis
│   │   │   ├── layout/     # Layout e navegação
│   │   │   ├── panels/     # Painéis específicos por usuário
│   │   │   └── ui/         # Componentes UI (shadcn/ui)
│   │   ├── pages/          # Páginas organizadas por perfil
│   │   │   ├── admin/      # Páginas do administrador
│   │   │   ├── vendor/     # Páginas do vendedor
│   │   │   ├── client/     # Páginas do cliente
│   │   │   ├── producer/   # Páginas do produtor
│   │   │   └── finance/    # Páginas financeiras
│   │   ├── hooks/          # Hooks customizados
│   │   └── lib/            # Utilitários e configurações
├── server/                 # Backend Express
│   ├── routes.ts           # Definição de rotas da API
│   ├── storage.ts          # Camada de dados
│   └── index.ts            # Servidor principal
├── shared/                 # Código compartilhado
│   └── schema.ts           # Schemas de validação
└── attached_assets/        # Documentos do projeto
```

## 🎨 Design System

### Cores Principais
- **Primary**: Azul (`hsl(200, 98%, 39%)`)
- **Secondary**: Verde (`hsl(159, 100%, 36%)`)
- **Gradient**: Gradiente do azul para verde
- **Background**: Cinza claro (`hsl(240, 5%, 96%)`)

### Tipografia
- **Fonte Principal**: Inter (Google Fonts)
- **Fallbacks**: Sans-serif system fonts

### Componentes
- **Cards**: Elementos com hover e sombras
- **Botões**: Estilo gradient para ações principais
- **Forms**: Validação em tempo real
- **Tables**: Responsivas com ordenação

## 🚀 Instalação e Execução

### Pré-requisitos
- Node.js (versão 16+)
- NPM ou Yarn
- Acesso ao banco PostgreSQL (Neon)

### Comandos
```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

### Configuração
- Configure as variáveis de ambiente para banco de dados
- Configure webhooks de pagamento
- Configure chaves de API necessárias

## 📈 Benefícios do Sistema

### Para a Empresa
- **Automação**: Redução de trabalho manual
- **Transparência**: Visibilidade completa do processo
- **Controle**: Gestão centralizada de todas as operações
- **Escalabilidade**: Suporte a crescimento do negócio

### Para Vendedores
- **Autonomia**: Links próprios para vendas
- **Acompanhamento**: Visibilidade dos seus pedidos
- **Comissões**: Transparência nos ganhos

### Para Clientes
- **Transparência**: Acompanhamento em tempo real
- **Confiança**: Informações sempre atualizadas
- **Experiência**: Interface simples e intuitiva

### Para Produtores
- **Organização**: Ordens de produção claras
- **Comunicação**: Canal direto com a empresa
- **Flexibilidade**: Sistema de aceite/recusa

## 🔮 Futuras Expansões

O sistema foi projetado de forma modular, permitindo:
- Integração com mais gateways de pagamento
- Aplicativo móvel nativo
- Sistema de chat integrado
- Relatórios avançados com BI
- Integração com sistemas de logística
- API pública para integrações externas

---

*Este documento reflete o estado atual do sistema baseado no código disponível e nas especificações técnicas implementadas.*
