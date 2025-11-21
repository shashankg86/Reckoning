# Email Setup Guide - Production (Resend)

## 📧 What is Resend?

Resend is a modern email API designed for developers. It's perfect for sending transactional emails (like invoices) to real customers.

### Benefits:
- ✅ **Free tier: 3,000 emails/month**
- ✅ **100 emails per day** on free tier
- ✅ **Excellent deliverability** (high inbox rate)
- ✅ **Simple API** with great documentation
- ✅ **Built-in analytics** and logging
- ✅ **React Email support** (for future enhancements)

### Requirements:
- ❗ **Verified custom domain required** (e.g., yourdomain.com)
- ❗ Domain costs ~₹500-1000/year (~$6-12/year)

---

## 🚀 Complete Setup Guide

### Phase 1: Get a Domain

#### Option 1: Buy a New Domain (Recommended)

**Popular Domain Registrars:**

| Provider | Cost (India) | Notes |
|----------|-------------|-------|
| [Namecheap](https://namecheap.com) | ₹500-800/year | Cheapest, great UI |
| [GoDaddy.in](https://godaddy.com) | ₹99 first year | Often has deals |
| [Hostinger](https://hostinger.in) | ₹599/year | Domain + hosting bundle |
| [Google Domains](https://domains.google) | ~$12/year | Clean, no upsells |
| [Cloudflare](https://cloudflare.com) | ~$10/year | At-cost pricing |

**Steps to buy:**
1. Go to any registrar above
2. Search for your desired domain (e.g., `mystore.com`, `myshop.in`)
3. Add to cart and purchase
4. You'll receive login credentials via email

**Domain Name Tips:**
- Keep it short and memorable
- Use `.com`, `.in`, `.net`, or `.co` for better trust
- Avoid hyphens and numbers
- Brand-related names work best (e.g., `nexlumo.in`)

#### Option 2: Use Existing Domain

If you already have a website domain, you can use it or create a subdomain:
- Main domain: `yourdomain.com`
- Subdomain for emails: `mail.yourdomain.com` or `receipts.yourdomain.com`

---

### Phase 2: Create Resend Account

1. Go to https://resend.com
2. Click **"Sign Up"**
3. Create account (free, no credit card required)
4. Verify your email address
5. You'll see the Resend dashboard

---

### Phase 3: Get Resend API Key

1. In Resend dashboard, go to **"API Keys"** (left sidebar)
2. Click **"Create API Key"**
3. Name it (e.g., "Production Invoice Emails")
4. Select permissions: **"Send emails"** (Full access)
5. Click **"Create"**
6. **Copy the API key** immediately (starts with `re_`)
   - Example: `re_abc123xyz789...`
   - ⚠️ **You can only see this ONCE!** Save it securely.

---

### Phase 4: Add Domain to Resend

1. In Resend dashboard, go to **"Domains"** (left sidebar)
2. Click **"Add Domain"**
3. Enter your domain:
   - If using main domain: `yourdomain.com`
   - If using subdomain: `mail.yourdomain.com`
4. Click **"Add Domain"**

Resend will show you **DNS records** to add. Keep this page open!

**Example DNS records you'll receive:**

```
Record 1: Domain Verification
Type: TXT
Name: @ (or leave blank)
Value: resend-verification=abc123xyz...

Record 2: DKIM Signature
Type: TXT
Name: resend._domainkey
Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNA...

Record 3: Mail Server (MX)
Type: MX
Name: @ (or leave blank)
Priority: 10
Value: feedback-smtp.us-east-1.amazonses.com

Record 4: SPF Policy
Type: TXT
Name: @ (or leave blank)
Value: v=spf1 include:amazonses.com ~all

Record 5: DMARC Policy
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

---

### Phase 5: Add DNS Records

Now go to your domain provider's DNS management panel:

#### For Namecheap:

1. Login to Namecheap account
2. Go to **"Domain List"**
3. Click **"Manage"** next to your domain
4. Go to **"Advanced DNS"** tab
5. Click **"Add New Record"** for each DNS record from Resend

**Adding each record:**

| What Resend Shows | How to Add in Namecheap |
|-------------------|-------------------------|
| Type: TXT<br>Name: @<br>Value: resend-verification=abc... | Type: TXT Record<br>Host: @<br>Value: resend-verification=abc...<br>TTL: Automatic |
| Type: TXT<br>Name: resend._domainkey<br>Value: p=MIGfMA0... | Type: TXT Record<br>Host: resend._domainkey<br>Value: p=MIGfMA0...<br>TTL: Automatic |
| Type: MX<br>Name: @<br>Priority: 10<br>Value: feedback-smtp... | Type: MX Record<br>Host: @<br>Value: feedback-smtp...<br>Priority: 10<br>TTL: Automatic |

6. Click **"Save All Changes"**

#### For GoDaddy:

1. Login to GoDaddy account
2. Go to **"My Products"** → **"Domains"**
3. Click **"DNS"** next to your domain
4. Click **"Add"** for each record
5. Select record type (TXT, MX, etc.)
6. Fill in Name, Value, Priority (for MX)
7. Click **"Save"**

#### For Cloudflare:

1. Login to Cloudflare
2. Select your domain
3. Go to **"DNS"** tab
4. Click **"Add record"**
5. Select Type, add Name and Content
6. **Important:** Set proxy status to **"DNS only"** (gray cloud)
7. Click **"Save"**

---

### Phase 6: Wait for Verification

1. After adding ALL DNS records, go back to Resend dashboard
2. Wait **5-30 minutes** for DNS propagation
3. Resend will automatically verify your domain
4. Refresh the page - you should see **"Verified"** status with a ✅ green checkmark

**Troubleshooting if not verified:**
- Wait longer (up to 48 hours in rare cases)
- Double-check all DNS records are correct
- Use DNS checker: https://dnschecker.org to verify records are propagated
- Check for typos in record values
- Contact Resend support if stuck

---

### Phase 7: Configure Supabase Secrets

Once domain is verified:

```bash
# Set Resend API key as Supabase secret
supabase secrets set RESEND_API_KEY=re_your_actual_key_here

# Verify it's set
supabase secrets list
```

Replace `re_your_actual_key_here` with your actual API key from Phase 3.

---

### Phase 8: Update Edge Function

Edit the file: `supabase/functions/email-invoice/index.ts`

**Find line 400:**
```typescript
from: 'onboarding@resend.dev', // Old test domain
```

**Change to:**
```typescript
from: 'Your Store Name <noreply@yourdomain.com>', // Your verified domain
```

**Examples:**
```typescript
// If your domain is mystore.com:
from: 'My Store <noreply@mystore.com>',

// If your domain is nexlumo.in:
from: 'Nexlumo <receipts@nexlumo.in>',

// Professional format:
from: 'Your Company <invoices@yourcompany.com>',
```

**Email address options:**
- `noreply@yourdomain.com` - Common for automated emails
- `invoices@yourdomain.com` - Clear purpose
- `receipts@yourdomain.com` - Alternative
- `hello@yourdomain.com` - Friendly tone

---

### Phase 9: Deploy Production Function

```bash
# Deploy the production email function
supabase functions deploy email-invoice

# You should see:
# Deploying Function (project: your-project)...
# Deployed Function email-invoice on project your-project
```

---

### Phase 10: Switch to Production Mode

Edit your `.env` file:

```bash
# Change from dev to production
VITE_EMAIL_MODE=production

# Or simply remove the line (production is default)
```

If deploying to production hosting (Vercel, Netlify, etc.), set the environment variable there:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables

---

### Phase 11: Test Production Email

1. Restart your development server (if testing locally):
   ```bash
   npm run dev
   ```

2. Create an invoice with a **REAL email address** (yours for testing)

3. Click "Send Invoice Email"

4. **Check your actual email inbox!** (Gmail, Outlook, etc.)

5. You should receive the invoice email within seconds

**First email checklist:**
- [ ] Email arrives in inbox (not spam)
- [ ] From address shows your domain
- [ ] Subject line is correct
- [ ] Invoice details are accurate
- [ ] HTML renders properly
- [ ] Images load (if any)
- [ ] Links work (if any)

---

## 🎯 Production Checklist

Before going live:

### Email Content:
- [ ] Invoice numbers are unique
- [ ] All amounts are correct (subtotal, tax, total)
- [ ] Customer details display correctly
- [ ] Store information is accurate
- [ ] Payment method shows correctly
- [ ] Date/time format is correct

### Technical:
- [ ] Domain is verified in Resend
- [ ] RESEND_API_KEY is set in Supabase secrets
- [ ] Edge function is deployed
- [ ] `from:` address uses your domain
- [ ] VITE_EMAIL_MODE=production (or removed)
- [ ] Test email arrives in real inbox

### Deliverability:
- [ ] Email lands in inbox (not spam)
- [ ] SPF, DKIM, DMARC records are set
- [ ] From address matches verified domain
- [ ] Reply-to address is valid (if set)

### Monitoring:
- [ ] Check Resend dashboard for sent emails
- [ ] Monitor delivery rates
- [ ] Watch for bounce/complaint rates
- [ ] Set up alerts for failures

---

## 📊 Monitoring & Analytics

### Resend Dashboard:

1. **View Sent Emails:**
   - Go to Resend dashboard → "Emails"
   - See all sent emails with status (delivered, bounced, etc.)

2. **Track Delivery:**
   - Delivery rate
   - Bounce rate
   - Complaint rate (spam reports)
   - Click rates (if you have links)

3. **View Email Logs:**
   - Click any email to see details
   - Delivery status
   - Error messages (if failed)
   - Delivery time

### Supabase Logs:

```bash
# View Edge Function logs
supabase functions logs email-invoice

# View recent errors
supabase functions logs email-invoice --filter "error"
```

---

## 🐛 Troubleshooting Production

### Problem: Emails going to spam

**Solutions:**
1. Verify all DNS records are correct (SPF, DKIM, DMARC)
2. Use DNS checker: https://mxtoolbox.com/SuperTool.aspx
3. Don't use spam trigger words: "free", "click here", "urgent"
4. Include plain text version (already handled)
5. Warm up your domain (send gradually increasing volume)
6. Add unsubscribe link (for marketing emails, not required for transactional)

### Problem: "Domain not verified"

**Solutions:**
1. Check DNS records are added correctly
2. Wait 24-48 hours for DNS propagation
3. Use https://dnschecker.org to verify records
4. Contact your domain registrar if records won't save
5. Try re-adding records in Resend

### Problem: High bounce rate

**Causes:**
- Invalid customer email addresses
- Typos in email addresses

**Solutions:**
- Validate email format in your form
- Ask customers to confirm email
- Remove bounced addresses from future sends

### Problem: "API key invalid"

**Solutions:**
```bash
# Regenerate API key in Resend dashboard
# Then update Supabase secret:
supabase secrets set RESEND_API_KEY=new_key_here

# Redeploy function:
supabase functions deploy email-invoice
```

### Problem: Emails not sending

**Debug steps:**
1. Check Supabase function logs:
   ```bash
   supabase functions logs email-invoice
   ```

2. Check browser console for errors

3. Verify domain is still verified in Resend

4. Check API key is valid (try sending test via Resend dashboard)

5. Ensure `from:` address uses verified domain

---

## 💰 Resend Pricing

| Plan | Cost | Emails/Month | Emails/Day |
|------|------|-------------|-----------|
| **Free** | $0 | 3,000 | 100 |
| **Pro** | $20 | 50,000 | No daily limit |
| **Enterprise** | Custom | Unlimited | No limit |

**Free tier is enough for:**
- 100 invoices per day
- 3,000 invoices per month
- Perfect for small to medium businesses

**Upgrade when:**
- You send more than 100 invoices/day
- You need priority support
- You want dedicated IP address
- You need advanced analytics

---

## 🔒 Security Best Practices

### API Key Security:

✅ **DO:**
- Store API key in Supabase secrets (never in `.env` file)
- Use different API keys for dev/staging/production
- Rotate API keys periodically
- Restrict API key permissions to "Send emails" only

❌ **DON'T:**
- Commit API keys to Git
- Share API keys publicly
- Use production keys in development
- Store keys in frontend code

### Email Security:

✅ **DO:**
- Always verify customer email addresses
- Use HTTPS for your website
- Log email sends for audit trail
- Monitor for suspicious activity

❌ **DON'T:**
- Send sensitive information in emails (passwords, etc.)
- Allow email injection attacks (validate inputs)
- Send emails without customer consent

---

## 📈 Scaling Considerations

### When you outgrow free tier:

**Option 1: Upgrade Resend to Pro**
- $20/month for 50,000 emails
- Best if you're happy with Resend

**Option 2: Switch to AWS SES**
- $0.10 per 1,000 emails
- Cheaper at high volume (>50k/month)
- More complex setup

**Option 3: Use multiple providers**
- Primary: Resend (fast, reliable)
- Backup: AWS SES (if Resend fails)
- Requires fallback logic

---

## 🎓 Learn More

- Resend Documentation: https://resend.com/docs
- Resend API Reference: https://resend.com/docs/api-reference
- Email Best Practices: https://resend.com/docs/knowledge-base
- DNS Setup Help: https://resend.com/docs/dashboard/domains/introduction

---

## ✅ Migration Complete Checklist

After switching from Mailtrap to Resend:

- [ ] Domain purchased and configured
- [ ] DNS records added and verified
- [ ] Resend API key set in Supabase
- [ ] Edge function updated with your domain
- [ ] Function deployed to production
- [ ] Environment variable set to production mode
- [ ] Test email sent successfully
- [ ] Email lands in inbox (not spam)
- [ ] All invoice details are correct
- [ ] Monitoring set up in Resend dashboard
- [ ] Team trained on checking email logs

---

## 🆘 Getting Help

**Resend Support:**
- Email: support@resend.com
- Discord: https://resend.com/discord
- Documentation: https://resend.com/docs

**Community:**
- Resend Discord (very responsive)
- Stack Overflow: Tag `resend`
- GitHub Discussions: https://github.com/resendlabs/resend-node

**Your Development Team:**
- Check logs: `supabase functions logs email-invoice`
- Review code: `supabase/functions/email-invoice/index.ts`
- Test in Mailtrap first before production changes

---

## 📝 Next Steps

Now that production email is working:

1. ✅ Monitor first few days of email sends
2. ✅ Set up SMS for OTP (see `docs/sms-setup-msg91.md`)
3. ✅ Consider WhatsApp integration for receipts
4. ✅ Implement email templates for different scenarios
5. ✅ Add email sending to other workflows (welcome emails, etc.)

**Ready for SMS?** See: [`docs/sms-setup-msg91.md`](./sms-setup-msg91.md)
