ALTER TABLE public.topup_requests ADD COLUMN IF NOT EXISTS request_id text;
ALTER TABLE public.topup_requests ADD COLUMN IF NOT EXISTS card_result text;