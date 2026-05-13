-- Add auto_approved column to topup_requests for tracking auto-approved transfers
ALTER TABLE public.topup_requests
ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS original_amount INTEGER;

-- Add comment for clarity
COMMENT ON COLUMN public.topup_requests.auto_approved IS 'Whether this topup was automatically approved via ATM auto-approval feature';
COMMENT ON COLUMN public.topup_requests.original_amount IS 'Original amount before bonus calculation for ATM transfers';
