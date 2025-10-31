
-- Adicionar campos de endereço de faturamento e entrega à tabela clients
ALTER TABLE "clients" 
ADD COLUMN "endereco_faturamento_logradouro" text,
ADD COLUMN "endereco_faturamento_numero" text,
ADD COLUMN "endereco_faturamento_complemento" text,
ADD COLUMN "endereco_faturamento_bairro" text,
ADD COLUMN "endereco_faturamento_cidade" text,
ADD COLUMN "endereco_faturamento_cep" text,
ADD COLUMN "endereco_entrega_logradouro" text,
ADD COLUMN "endereco_entrega_numero" text,
ADD COLUMN "endereco_entrega_complemento" text,
ADD COLUMN "endereco_entrega_bairro" text,
ADD COLUMN "endereco_entrega_cidade" text,
ADD COLUMN "endereco_entrega_cep" text;
