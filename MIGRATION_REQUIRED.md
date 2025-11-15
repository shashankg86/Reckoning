# Database Migration Required

## Issue

The `image_url` column is missing from the `categories` table in your Supabase database.

**Error:**
```
Could not find the 'image_url' column of 'categories' in the schema cache
```

## Solution

Run the pending migration to add the `image_url` column to the categories table.

### Option 1: Using Supabase CLI (Recommended)

```bash
# Navigate to project directory
cd /home/user/Reckoning

# Run migrations
npx supabase db push

# Or if you have Supabase CLI installed
supabase db push
```

### Option 2: Manual SQL Execution

1. Open your Supabase dashboard
2. Go to SQL Editor
3. Run the following SQL:

```sql
-- Add image_url column to categories table
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.categories.image_url IS 'Optional image URL for category display';
```

### Option 3: Run Migration File Directly

The migration file is located at:
```
supabase/migrations/20251113000_add_image_url_to_categories.sql
```

Copy the contents and run it in your Supabase SQL Editor.

## Verification

After running the migration, verify the column was added:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'categories'
  AND column_name = 'image_url';
```

You should see:
```
column_name | data_type
image_url   | text
```

## Related Files

- Migration: `supabase/migrations/20251113000_add_image_url_to_categories.sql`
- API: `src/api/categories.ts` (uses `image_url` field)
- Types: `src/types/menu.ts` (Category interface includes `image_url`)
