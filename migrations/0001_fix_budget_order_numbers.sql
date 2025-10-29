
-- Create sequences for budget and order numbers
CREATE SEQUENCE IF NOT EXISTS budget_number_seq;
CREATE SEQUENCE IF NOT EXISTS order_number_seq;

-- Set default values for budget_number and order_number columns
-- This ensures that even if the application code doesn't generate the number,
-- the database will create one automatically
ALTER TABLE budgets ALTER COLUMN budget_number SET DEFAULT 
  ('BUD-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(nextval('budget_number_seq')::text, 6, '0'));

ALTER TABLE orders ALTER COLUMN order_number SET DEFAULT 
  ('PED-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(nextval('order_number_seq')::text, 6, '0'));

-- Update any existing records that have null budget_number or order_number
UPDATE budgets SET budget_number = 
  ('BUD-' || TO_CHAR(created_at, 'YYMM') || '-' || LPAD(nextval('budget_number_seq')::text, 6, '0'))
WHERE budget_number IS NULL;

UPDATE orders SET order_number = 
  ('PED-' || TO_CHAR(created_at, 'YYMM') || '-' || LPAD(nextval('order_number_seq')::text, 6, '0'))
WHERE order_number IS NULL;
