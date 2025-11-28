-- Add permissions column to store_members table
ALTER TABLE public.store_members 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN public.store_members.permissions IS 'JSON object storing granular permissions for the user in this store. Keys are permission names (e.g. "manage_menu"), values are booleans.';
