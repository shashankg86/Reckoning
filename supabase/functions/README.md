# Supabase Edge Functions

This directory contains Supabase Edge Functions for the Reckoning POS application.

## Available Functions

### `send-invoice-email`

Sends invoice emails to customers via Resend API after payment completion.

**Why Edge Function?**
- ✅ Keeps Resend API key secure on the server
- ✅ No CORS issues
- ✅ Free tier: 3,000 emails/month via Resend
- ✅ Easy to monitor via Supabase Dashboard

## Setup & Deployment

### Prerequisites

1. **Supabase CLI** installed:
   ```bash
   npm install -g supabase
   ```

2. **Resend Account** (FREE):
   - Sign up at https://resend.com
   - Get your API key from the dashboard

### Step 1: Link Your Supabase Project

```bash
# Login to Supabase
supabase login

# Link to your remote project
supabase link --project-ref your-project-ref
```

**To find your project-ref:**
- Go to your Supabase dashboard
- Project URL: `https://YOUR-PROJECT-REF.supabase.co`
- The `YOUR-PROJECT-REF` part is your project ref

### Step 2: Configure Resend API Key Secret

You need to add your Resend API key as a secret (environment variable) in Supabase:

```bash
# Set the RESEND_API_KEY secret
supabase secrets set RESEND_API_KEY=re_your_actual_api_key_here
```

**Get your Resend API key:**
1. Go to https://resend.com
2. Dashboard → API Keys
3. Copy your API key (starts with `re_`)

### Step 3: Deploy the Edge Function

```bash
# Deploy the send-invoice-email function
supabase functions deploy send-invoice-email
```

### Step 4: Verify Deployment

After deployment, you should see output like:
```
Deployed Function send-invoice-email
Version: xxx
Status: ACTIVE
```

**Test the function** in Supabase Dashboard:
1. Go to Edge Functions → send-invoice-email
2. Click "Invoke Function"
3. Use test payload (see below)

## Testing

### Test Payload Example

```json
{
  "to": "customer@example.com",
  "invoiceNumber": "INV-00001",
  "customerName": "John Doe",
  "storeName": "My Store",
  "storePhone": "+919876543210",
  "storeEmail": "store@example.com",
  "storeAddress": "123 Main St",
  "items": [
    {
      "name": "Cappuccino",
      "quantity": 2,
      "price": 150,
      "total": 300
    }
  ],
  "subtotal": 300,
  "discount": 0,
  "tax": 15,
  "total": 315,
  "paymentMethod": "CASH",
  "date": "20 November 2025 at 11:49 am",
  "taxComponents": [
    {
      "name": "GST",
      "rate": 5,
      "amount": 15
    }
  ]
}
```

### Test via CLI

```bash
supabase functions invoke send-invoice-email \
  --data '{"to":"test@example.com","invoiceNumber":"TEST-001","customerName":"Test User","storeName":"Test Store","items":[{"name":"Test Item","quantity":1,"price":100,"total":100}],"subtotal":100,"discount":0,"tax":5,"total":105,"paymentMethod":"CASH","date":"Today"}'
```

## Monitoring

### View Logs

```bash
# View real-time logs
supabase functions logs send-invoice-email --tail

# View recent logs
supabase functions logs send-invoice-email
```

### In Supabase Dashboard

1. Go to **Edge Functions** → `send-invoice-email`
2. Click **Logs** tab
3. See all invocations, errors, and execution time

## Troubleshooting

### Common Errors

#### 1. "RESEND_API_KEY is not configured"

**Solution:**
```bash
supabase secrets set RESEND_API_KEY=re_your_key_here
```

#### 2. CORS errors

**Solution:** The function already includes CORS headers. Make sure you're calling from an allowed origin.

#### 3. Email not sending

**Causes:**
- Invalid email address
- Resend API key expired/invalid
- Domain not verified in Resend

**Check:**
1. Verify API key is correct: `supabase secrets list`
2. Check Resend dashboard for errors
3. Verify sending domain in Resend

#### 4. Function not found

**Solution:**
```bash
# List deployed functions
supabase functions list

# Redeploy if needed
supabase functions deploy send-invoice-email
```

## Development

### Local Testing

Run the function locally with Supabase CLI:

```bash
# Serve all functions locally
supabase functions serve send-invoice-email --env-file .env.local

# In another terminal, invoke it
supabase functions invoke send-invoice-email \
  --data '{"to":"test@example.com",...}' \
  --local
```

### Environment Variables for Local Testing

Create `.env.local` in `/supabase` directory:

```bash
RESEND_API_KEY=re_your_dev_key_here
```

**Note:** Don't commit `.env.local` to git!

## Cost

### Resend Free Tier

- **3,000 emails/month** FREE
- **100 emails/day** limit
- No credit card required

### Supabase Edge Functions

- **500K requests/month** FREE
- **2GB outbound data transfer/month** FREE

**Perfect for small to medium businesses!**

## Updating the Function

After making changes to `supabase/functions/send-invoice-email/index.ts`:

```bash
# Deploy the updated function
supabase functions deploy send-invoice-email

# Or deploy all functions
supabase functions deploy
```

## Security

- ✅ Resend API key is stored in Supabase secrets (never exposed to client)
- ✅ Function validates input data
- ✅ CORS configured for your domain
- ✅ Automatic rate limiting by Supabase

## Support

If you encounter issues:

1. Check function logs: `supabase functions logs send-invoice-email`
2. Verify secrets: `supabase secrets list`
3. Test locally first before deploying
4. Check Resend dashboard for email delivery status

## Next Steps

After successful deployment:

1. ✅ Test with a real email
2. ✅ Verify email delivery in Resend dashboard
3. ✅ Monitor function logs for errors
4. ✅ Update store contact details in database (for invoice headers)
5. ✅ Configure verified sending domain in Resend (optional, for better deliverability)
