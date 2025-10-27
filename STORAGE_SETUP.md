# Supabase Storage Setup

## Required Storage Bucket

The application uses Supabase Storage for storing uploaded images (store logos, product images, etc.). You need to create a storage bucket in your Supabase project.

### 1. Create Storage Bucket

In your Supabase project dashboard:

1. Go to **Storage** section in the left sidebar
2. Click **New Bucket**
3. Configure the bucket:
   - **Name**: `store-assets`
   - **Public**: ✓ Enable (so logo URLs are publicly accessible)
   - **File size limit**: 5 MB (or higher if needed)
   - **Allowed MIME types**: `image/*` (or specify: `image/png`, `image/jpeg`, `image/gif`, `image/svg+xml`)

### 2. Storage Policies

After creating the bucket, set up Row Level Security (RLS) policies:

#### Policy 1: Allow Authenticated Users to Upload
```sql
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'store-assets');
```

#### Policy 2: Public Read Access
```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'store-assets');
```

#### Policy 3: Allow Users to Delete Their Own Files
```sql
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'store-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 3. Folder Structure

The application organizes files in the following structure:
```
store-assets/
└── logos/
    ├── {store-id}/
    │   └── {sanitized-filename}-{timestamp}.{ext}
    └── {sanitized-filename}-{timestamp}.{ext}
```

### 4. Usage in Code

The storage API is located at `src/api/storage.ts` and provides these functions:

- `uploadImage(file, bucket?, folder?)` - Upload any image file
- `uploadStoreLogo(file, storeId?)` - Upload a store logo (automatically uses 'logos' folder)
- `deleteFile(path, bucket?)` - Delete a file from storage
- `checkBucket(bucket?)` - Check if bucket exists and is accessible

### 5. Environment Variables

No additional environment variables are needed. The storage API uses the existing Supabase client configuration:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 6. File Upload Limits

- **Max file size**: 5 MB (configurable in ImageUpload component)
- **Allowed formats**: PNG, JPG, GIF, SVG
- **Validation**: Client-side validation before upload
- **Security**: Server-side validation through Supabase Storage policies

## Testing

To test the storage setup:

1. Complete the onboarding flow
2. Try uploading a store logo using drag-and-drop or click
3. Verify the file appears in Supabase Storage dashboard
4. Check that the logo URL is saved correctly in the `stores.logo_url` field

## Troubleshooting

### Upload fails with "Failed to upload file"
- Check that the `store-assets` bucket exists
- Verify storage policies are set up correctly
- Check browser console for detailed error messages

### Images not displaying
- Ensure the bucket is set to **Public**
- Verify the public read policy is active
- Check the URL format in the database

### Permission errors
- Confirm user is authenticated before uploading
- Check RLS policies on the storage.objects table
- Verify the bucket name matches in code and dashboard
