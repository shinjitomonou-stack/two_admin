-- Migration: Add additional client information fields
-- Created: 2025-12-04

-- Add business information
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS business_number TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS representative_name TEXT;

-- Add bank account information
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS bank_branch_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS bank_account_type TEXT CHECK (bank_account_type IN ('普通', '当座', NULL));
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS bank_account_holder TEXT;

-- Add billing contact information
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_contact_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_contact_email TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_contact_phone TEXT;

-- Add billing method
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_method TEXT CHECK (billing_method IN ('銀行振込', '請求書払い', 'クレジットカード', 'その他', NULL)) DEFAULT '銀行振込';

-- Add comment for documentation
COMMENT ON COLUMN public.clients.business_number IS '事業者番号（法人番号など）';
COMMENT ON COLUMN public.clients.representative_name IS '代表者名';
COMMENT ON COLUMN public.clients.bank_name IS '銀行名';
COMMENT ON COLUMN public.clients.bank_branch_name IS '支店名';
COMMENT ON COLUMN public.clients.bank_account_type IS '口座種別（普通/当座）';
COMMENT ON COLUMN public.clients.bank_account_number IS '口座番号';
COMMENT ON COLUMN public.clients.bank_account_holder IS '口座名義';
COMMENT ON COLUMN public.clients.billing_contact_name IS '請求担当者氏名';
COMMENT ON COLUMN public.clients.billing_contact_email IS '請求担当者メールアドレス';
COMMENT ON COLUMN public.clients.billing_contact_phone IS '請求担当者電話番号';
COMMENT ON COLUMN public.clients.billing_method IS '請求方法';
