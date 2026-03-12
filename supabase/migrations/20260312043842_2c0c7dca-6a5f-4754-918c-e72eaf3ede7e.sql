
-- Discount codes table
CREATE TABLE public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_percent integer NOT NULL DEFAULT 0,
  discount_amount integer NOT NULL DEFAULT 0,
  max_uses integer DEFAULT NULL,
  used_count integer NOT NULL DEFAULT 0,
  min_order_amount integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active discount codes" ON public.discount_codes
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage discount codes" ON public.discount_codes
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add image_url to products and categories
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;

-- Storage bucket for product/category images
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);

CREATE POLICY "Anyone can view images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'images');
CREATE POLICY "Admins can upload images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'images' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'images' AND has_role(auth.uid(), 'admin'));
