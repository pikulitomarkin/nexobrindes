-- =============================================================================
-- MIGRAÇÃO: Limpar banco para teste de QA
-- =============================================================================
-- Remove todos os dados mantendo APENAS o usuário admin.
-- Execute no SQL Editor do Supabase/PostgreSQL.
--
-- ATENÇÃO: Esta operação é IRREVERSÍVEL. Faça backup antes de executar.
-- Login após limpeza: username=admin, senha=123456
-- =============================================================================

BEGIN;

-- 1. Truncar todas as tabelas (exceto users) em uma única operação
-- O CASCADE resolve as dependências de foreign key automaticamente
TRUNCATE TABLE
  payment_allocations,
  bank_transactions,
  bank_imports,
  producer_payments,
  production_order_items,
  production_orders,
  expense_notes,
  commission_payouts,
  commissions,
  payments,
  accounts_receivable,
  manual_receivables,
  manual_payables,
  quote_request_items,
  quote_requests,
  budget_payment_info,
  budget_photos,
  budget_items,
  budgets,
  orders,
  clients,
  partners,
  vendors,
  customization_options,
  products,
  log_backups,
  system_logs,
  pricing_margin_tiers,
  pricing_settings,
  commission_settings,
  branches,
  payment_methods,
  shipping_methods
CASCADE;

-- 2. Remover todos os usuários EXCETO o admin
DELETE FROM users WHERE username != 'admin' OR role != 'admin';

-- 3. Garantir que o admin existe (criar se não existir)
INSERT INTO users (
  username,
  password,
  role,
  name,
  email,
  phone,
  vendor_id,
  is_active,
  is_commissioned,
  specialty,
  address
) VALUES (
  'admin',
  '123456',
  'admin',
  'Administrador do Sistema',
  'admin@nexobrindes.com',
  NULL,
  NULL,
  true,
  true,
  NULL,
  NULL
)
ON CONFLICT (username) DO UPDATE SET
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  is_active = EXCLUDED.is_active;

COMMIT;

-- Verificação final
SELECT 'Limpeza concluída. Usuários restantes:' AS status;
SELECT id, username, role, name, email FROM users;
