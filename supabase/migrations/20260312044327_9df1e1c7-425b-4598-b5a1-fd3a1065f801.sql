
-- CTV (collaborator) assignments table
CREATE TABLE public.ctv_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid DEFAULT NULL,
  assigned_categories text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ctv_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage CTV" ON public.ctv_assignments
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "CTV can view own assignment" ON public.ctv_assignments
  FOR SELECT TO authenticated USING (user_id = auth.uid());
