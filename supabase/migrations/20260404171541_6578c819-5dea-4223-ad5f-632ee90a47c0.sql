
-- 1. Add RLS policy so CTV can find their assignment by email (via auth.jwt())
CREATE POLICY "CTV can view assignment by email"
ON public.ctv_assignments
FOR SELECT
TO authenticated
USING (lower(email) = lower(auth.jwt()->>'email'));

-- 2. Drop the old user_id based policy that doesn't work
DROP POLICY IF EXISTS "CTV can view own assignment" ON public.ctv_assignments;

-- 3. Create a function to check if user is CTV for a given category
CREATE OR REPLACE FUNCTION public.is_ctv_for_category(_user_id uuid, _category text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ctv_assignments
    WHERE lower(email) = lower((SELECT email FROM auth.users WHERE id = _user_id))
      AND is_active = true
      AND _category = ANY(assigned_categories)
  )
$$;

-- 4. Create a function to check if user is any active CTV
CREATE OR REPLACE FUNCTION public.is_active_ctv(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ctv_assignments
    WHERE lower(email) = lower((SELECT email FROM auth.users WHERE id = _user_id))
      AND is_active = true
  )
$$;

-- 5. Allow CTV to insert products (they can only insert, admin validates)
CREATE POLICY "CTV can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (public.is_active_ctv(auth.uid()));

-- 6. Allow CTV to view products they could manage
CREATE POLICY "CTV can view products in assigned categories"
ON public.products
FOR SELECT
TO authenticated
USING (public.is_active_ctv(auth.uid()));

-- 7. Allow CTV to update products in their assigned categories
CREATE POLICY "CTV can update products in assigned categories"
ON public.products
FOR UPDATE
TO authenticated
USING (public.is_active_ctv(auth.uid()));

-- 8. Allow CTV to insert product accounts
CREATE POLICY "CTV can insert product_accounts"
ON public.product_accounts
FOR INSERT
TO authenticated
WITH CHECK (public.is_active_ctv(auth.uid()));

-- 9. Allow CTV to view product accounts
CREATE POLICY "CTV can view product_accounts"
ON public.product_accounts
FOR SELECT
TO authenticated
USING (public.is_active_ctv(auth.uid()));

-- 10. Allow CTV to delete product accounts
CREATE POLICY "CTV can delete product_accounts"
ON public.product_accounts
FOR DELETE
TO authenticated
USING (public.is_active_ctv(auth.uid()));
