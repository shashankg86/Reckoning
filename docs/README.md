# 📚 Reckoning POS - Documentation

Welcome to the Reckoning POS documentation! This folder contains comprehensive setup guides for all external services used in the application.

---

## 📧 Email Services

### Development (No Domain Required)
**📄 [Mailtrap Setup Guide](./email-setup-mailtrap.md)**
- Perfect for local development and testing
- No domain verification needed
- Free tier: 500 emails/month
- Emails caught in test inbox (not delivered)
- Setup time: 5 minutes

**Use this for:** Testing invoice emails during development without sending real emails.

---

### Production (Domain Required)
**📄 [Resend Setup Guide](./email-setup-resend.md)**
- For sending real emails to customers
- Requires verified custom domain
- Free tier: 3,000 emails/month
- Professional email delivery
- Setup time: 30-60 minutes (including domain verification)

**Use this for:** Sending actual invoice emails to customers in production.

---

## 📱 SMS Services

### MSG91 (India-Focused)
**📄 [MSG91 Setup Guide](./sms-setup-msg91.md)**
- Best SMS service for India
- Cheapest rates: ₹0.15-0.25 per SMS
- OTP authentication
- DLT registration help
- Free trial credits
- Setup time: 15-30 minutes

**Use this for:** OTP verification during signup/login, and SMS notifications.

---

## 🗺️ Service Selection Guide

### For Email:

| Scenario | Recommended Service | Guide |
|----------|-------------------|-------|
| Local development & testing | Mailtrap | [Setup Guide](./email-setup-mailtrap.md) |
| Production (have domain) | Resend | [Setup Guide](./email-setup-resend.md) |
| Production (no domain yet) | Get a domain first! | See Resend guide for domain options |

### For SMS:

| Scenario | Recommended Service | Guide |
|----------|-------------------|-------|
| India-based customers | MSG91 | [Setup Guide](./sms-setup-msg91.md) |
| Global customers | Twilio | Contact support for guide |
| High volume (>100k/month) | AWS SNS | Contact support for guide |

---

## 🚀 Quick Start

### Step 1: Email (Development)
1. Read: [Mailtrap Setup Guide](./email-setup-mailtrap.md)
2. Create Mailtrap account (free)
3. Get SMTP credentials
4. Set Supabase secrets
5. Deploy `email-invoice-dev` function
6. Set `VITE_EMAIL_MODE=dev` in `.env`
7. Test invoice email sending

**Time required:** 5-10 minutes

---

### Step 2: SMS (Optional)
1. Read: [MSG91 Setup Guide](./sms-setup-msg91.md)
2. Create MSG91 account (free trial)
3. Get Auth Key and Template ID
4. Set environment variables in `.env`
5. Test OTP sending

**Time required:** 15-30 minutes (excluding DLT registration)

---

### Step 3: Email (Production)
**When you're ready to send real emails:**

1. Purchase a domain (~₹500-1000/year)
2. Read: [Resend Setup Guide](./email-setup-resend.md)
3. Create Resend account
4. Verify your domain (add DNS records)
5. Get Resend API key
6. Update Edge Function with your domain
7. Deploy `email-invoice` function
8. Set `VITE_EMAIL_MODE=production` in `.env`
9. Test with real customer email

**Time required:** 30-60 minutes

---

## 📊 Cost Estimates

### Starting Out (0-100 transactions/day)

| Service | Free Tier | Paid Tier (if needed) | Monthly Cost |
|---------|-----------|----------------------|--------------|
| **Mailtrap** (Dev) | 500 emails | N/A | ₹0 |
| **Resend** (Prod) | 3,000 emails/month | $20/mo (50k emails) | ₹0 (free tier sufficient) |
| **MSG91** (SMS) | Trial credits | ₹0.25 per SMS | ₹750 (100 OTP/day) |
| **Domain** | N/A | One-time purchase | ₹500-1000/year |
| **Total** | | | **~₹800-1800/year** |

### Growing (500 transactions/day)

| Service | Monthly Cost |
|---------|--------------|
| Resend (Email) | ₹0 (still in free tier) |
| MSG91 (SMS) | ₹3,750 |
| Domain | ₹42-84/month (prorated) |
| **Total** | **~₹3,800-3,850/month** |

Very affordable for a growing business! 🎉

---

## 🔄 Migration Path

### Phase 1: Development (Current)
```
Email: Mailtrap (no domain needed)
SMS: MSG91 test credits
Cost: ₹0
```

### Phase 2: Production (When you get domain)
```
Email: Resend + your domain
SMS: MSG91 with DLT
Cost: ~₹800-4000/month depending on volume
```

### Phase 3: Scaling (High volume)
```
Email: Resend Pro or AWS SES
SMS: MSG91 with volume discounts
WhatsApp: MSG91 WhatsApp Business API
Cost: Negotiate enterprise rates
```

---

## 🛠️ Environment Variables Summary

### Development (.env)
```bash
# Supabase (Required)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Email - Development Mode
VITE_EMAIL_MODE=dev

# SMS - MSG91 (Optional)
VITE_MSG91_AUTH_KEY=your_auth_key
VITE_MSG91_TEMPLATE_ID=your_template_id
VITE_MSG91_SENDER=RECKNG
```

### Production (.env)
```bash
# Supabase (Required)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Email - Production Mode
VITE_EMAIL_MODE=production
# (or simply remove this line - production is default)

# SMS - MSG91
VITE_MSG91_AUTH_KEY=your_auth_key
VITE_MSG91_TEMPLATE_ID=your_template_id
VITE_MSG91_SENDER=YOUR_APPROVED_SENDER_ID
```

### Supabase Secrets (Set via CLI)
```bash
# For Development (Mailtrap)
supabase secrets set MAILTRAP_USER=your_mailtrap_username
supabase secrets set MAILTRAP_PASS=your_mailtrap_password

# For Production (Resend)
supabase secrets set RESEND_API_KEY=re_your_resend_key
```

---

## 📖 Additional Resources

### Official Documentation
- **Supabase:** https://supabase.com/docs
- **Resend:** https://resend.com/docs
- **Mailtrap:** https://help.mailtrap.io
- **MSG91:** https://docs.msg91.com

### Video Tutorials
- Supabase Edge Functions: https://www.youtube.com/watch?v=rzglqRdZUQE
- Resend Email Setup: https://resend.com/docs/getting-started
- MSG91 SMS Integration: https://www.youtube.com/@MSG91

### Community Support
- Supabase Discord: https://discord.supabase.com
- Resend Discord: https://resend.com/discord
- MSG91 Support: support@msg91.com

---

## 🐛 Common Issues

### Email not sending?
1. Check which mode you're in (dev/production)
2. Verify Supabase secrets are set
3. Check Edge Function logs: `supabase functions logs email-invoice-dev`
4. See specific troubleshooting in respective guide

### SMS not working?
1. Verify AUTH_KEY is correct
2. Check phone number format (919876543210)
3. Ensure template is approved
4. Check MSG91 credit balance
5. See [SMS Troubleshooting Guide](./sms-setup-msg91.md#-troubleshooting)

### Domain not verifying?
1. Wait 24-48 hours for DNS propagation
2. Use https://dnschecker.org to verify DNS records
3. Double-check all records are added correctly
4. See [Resend Domain Setup](./email-setup-resend.md#phase-5-add-dns-records)

---

## 📞 Getting Help

### For Setup Issues:
1. Check the relevant guide in this folder
2. Review troubleshooting sections
3. Check service provider's documentation
4. Contact service provider support

### For Code Issues:
1. Check browser console for errors
2. Review Supabase Edge Function logs
3. Check your `.env` configuration
4. Review the relevant service integration code

### Service Support:
- **Resend:** support@resend.com
- **Mailtrap:** support@mailtrap.io
- **MSG91:** support@msg91.com | +91-120-6471200

---

## ✅ Pre-Launch Checklist

Before launching to production:

### Email:
- [ ] Domain purchased and DNS configured
- [ ] Resend domain verified
- [ ] Test email sent and received successfully
- [ ] Email lands in inbox (not spam)
- [ ] Invoice details render correctly
- [ ] Edge Function deployed to production

### SMS:
- [ ] MSG91 account KYC completed
- [ ] DLT registration completed (for India)
- [ ] Sender ID approved
- [ ] OTP template approved
- [ ] Test OTP sent and verified successfully
- [ ] Rate limiting implemented

### General:
- [ ] All environment variables configured
- [ ] All Supabase secrets set
- [ ] Error logging implemented
- [ ] Monitoring/alerts set up
- [ ] Cost estimates reviewed
- [ ] Team trained on troubleshooting

---

## 🎉 What's Next?

After setting up all services:

1. **Test Everything:** Run through complete user flows
2. **Monitor Closely:** Watch for any issues in first few days
3. **Optimize Costs:** Review usage and optimize where possible
4. **Consider WhatsApp:** For richer customer communication
5. **Add Analytics:** Track email open rates, SMS delivery rates
6. **Scale Gradually:** Monitor costs as you grow

---

## 📝 Document Updates

This documentation is maintained as part of the Reckoning POS project. If you find any issues or have suggestions:

1. Update the relevant guide
2. Test the changes
3. Commit with clear description
4. Notify the team

---

**Last Updated:** 2025-01-21
**Version:** 1.0.0
**Maintainer:** Development Team

---

## 🚀 Ready to Get Started?

Choose your starting point:

- 🔧 **Setting up development environment?** → Start with [Mailtrap Guide](./email-setup-mailtrap.md)
- 🌐 **Ready for production?** → Start with [Resend Guide](./email-setup-resend.md)
- 📱 **Need SMS/OTP?** → Start with [MSG91 Guide](./sms-setup-msg91.md)

Good luck! 🎊
