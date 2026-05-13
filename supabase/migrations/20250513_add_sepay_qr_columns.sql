-- Add Sepay QR code columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_qr_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_name VARCHAR(10) DEFAULT 'MB';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_holder VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS qr_generated_at TIMESTAMP;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_bank_qr_code ON profiles(bank_qr_code);
