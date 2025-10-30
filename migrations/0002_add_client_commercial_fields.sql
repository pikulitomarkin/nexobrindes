
-- Adicionar novos campos comerciais à tabela clients
ALTER TABLE "clients" 
ADD COLUMN "nome_fantasia" text,
ADD COLUMN "razao_social" text,
ADD COLUMN "inscricao_estadual" text,
ADD COLUMN "logradouro" text,
ADD COLUMN "numero" text,
ADD COLUMN "complemento" text,
ADD COLUMN "bairro" text,
ADD COLUMN "cidade" text,
ADD COLUMN "cep" text,
ADD COLUMN "email_boleto" text,
ADD COLUMN "email_nf" text,
ADD COLUMN "nome_contato" text,
ADD COLUMN "email_contato" text;
