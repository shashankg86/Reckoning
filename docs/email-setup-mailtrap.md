# Email Setup Guide - Development (Mailtrap)

## 📧 What is Mailtrap?

Mailtrap is a fake SMTP server that catches all your emails in a test inbox. **No emails are actually sent to customers** - perfect for development and testing!

### Benefits:
- ✅ **No domain required**
- ✅ **Free tier: 500 emails/month**
- ✅ **Safe testing** - use real customer emails without spamming them
- ✅ **Beautiful email preview** with HTML rendering
- ✅ **Instant setup** (5 minutes)

---

## 🚀 Step-by-Step Setup

### Step 1: Create Mailtrap Account

1. Go to https://mailtrap.io
2. Click **"Sign Up"** (free account)
3. Verify your email address
4. You'll be automatically logged in

### Step 2: Get SMTP Credentials

1. In Mailtrap dashboard, you'll see **"My Inbox"** (or create a new inbox)
2. Click on your inbox
3. Go to **"SMTP Settings"** tab
4. You'll see credentials like this:

```
Host: sandbox.smtp.mailtrap.io
Port: 2525
Username: a1b2c3d4e5f6g7  (example)
Password: h8i9j0k1l2m3n4  (example)
```

5. **Copy the Username and Password** - you'll need these next

### Step 3: Configure Supabase Secrets

Open your terminal and run:

```bash
# Navigate to your project
cd /path/to/Reckoning

# Set Mailtrap credentials as Supabase secrets
supabase secrets set MAILTRAP_USER=your_username_here
supabase secrets set MAILTRAP_PASS=your_password_here

# Verify secrets were set
supabase secrets list
```

**Important:** Replace `your_username_here` and `your_password_here` with the actual values from Step 2.

### Step 4: Deploy the Development Email Function

```bash
# Deploy the email-invoice-dev function
supabase functions deploy email-invoice-dev

# You should see output like:
# Deploying Function (project: your-project)...
# Deployed Function email-invoice-dev on project your-project
```

### Step 5: Configure Your Local Environment

Edit your `.env` file:

```bash
# Add this line to use development email mode
VITE_EMAIL_MODE=dev
```

**Alternative:** If you're running `npm run dev`, the app automatically uses dev mode (no need to set VITE_EMAIL_MODE).

### Step 6: Test Email Sending

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Create an invoice in your app with a customer email (use any email, even fake ones like `test@example.com`)

3. Click "Send Invoice Email"

4. Go back to **Mailtrap inbox** - you should see the email there!

5. Click the email to preview it with full HTML rendering

---

## 🎨 Viewing Your Test Emails

### In Mailtrap Dashboard:

1. Go to https://mailtrap.io/inboxes
2. Click your inbox
3. You'll see all "sent" emails listed
4. Click any email to:
   - View HTML preview
   - View plain text version
   - Check email headers
   - Analyze spam score
   - View raw source

### Email Preview Features:

- **HTML View**: See exactly how the email looks
- **Text View**: Plain text version
- **Raw View**: Full email source code
- **Spam Analysis**: Check if your email might be flagged as spam
- **Forwarding**: Forward test emails to your real inbox

---

## 🐛 Troubleshooting

### Problem: "MAILTRAP_USER is not configured"

**Solution:**
```bash
# Check if secrets are set
supabase secrets list

# If missing, set them again
supabase secrets set MAILTRAP_USER=your_username
supabase secrets set MAILTRAP_PASS=your_password

# Redeploy the function
supabase functions deploy email-invoice-dev
```

### Problem: "Failed to send email via Edge Function"

**Solution:**
1. Check Supabase Edge Function logs:
   ```bash
   supabase functions logs email-invoice-dev
   ```

2. Verify your SMTP credentials are correct in Mailtrap dashboard

3. Make sure you deployed the function:
   ```bash
   supabase functions deploy email-invoice-dev
   ```

### Problem: Emails not appearing in Mailtrap

**Solution:**
1. Check browser console for errors
2. Verify `VITE_EMAIL_MODE=dev` is set in `.env`
3. Restart your dev server after changing `.env`
4. Check Mailtrap inbox - try refreshing the page

### Problem: "Connection refused" or timeout errors

**Solution:**
1. Verify Mailtrap credentials are correct
2. Check if Mailtrap service is up: https://status.mailtrap.io
3. Try regenerating your Mailtrap credentials:
   - Go to Mailtrap inbox settings
   - Click "Regenerate Credentials"
   - Update Supabase secrets with new values

---

## 📝 Testing Checklist

Before moving to production, test these scenarios:

- [ ] Send invoice with single item
- [ ] Send invoice with multiple items
- [ ] Send invoice with discount
- [ ] Send invoice with tax
- [ ] Test with long customer names
- [ ] Test with special characters in item names
- [ ] Verify email HTML renders correctly
- [ ] Check email on mobile preview (Mailtrap has this feature)
- [ ] Test with different store names
- [ ] Verify all invoice details are accurate

---

## 🔄 Switching to Production

When you're ready to send real emails to customers:

1. Follow the **Resend Setup Guide** (see `docs/email-setup-resend.md`)
2. Get a domain and verify it
3. Change `VITE_EMAIL_MODE=production` in `.env`
4. Redeploy your app

---

## 💡 Pro Tips

### Tip 1: Create Multiple Inboxes
- Create separate Mailtrap inboxes for different environments
- Example: `dev-emails`, `staging-emails`, `testing-emails`

### Tip 2: Share Inboxes with Team
- Invite team members to view the same inbox
- Great for QA testing

### Tip 3: Use Email Forwarding
- Forward specific test emails to your real inbox
- Useful for checking how emails look in real email clients

### Tip 4: Test Spam Score
- Mailtrap shows spam score for each email
- Aim for score below 5.0 for good deliverability

### Tip 5: Check Different Email Clients
- Use Mailtrap's email preview feature
- Test how your email looks in Gmail, Outlook, Apple Mail, etc.

---

## 📊 Mailtrap Free Tier Limits

| Feature | Free Tier |
|---------|-----------|
| Emails per month | 500 |
| Inboxes | 1 |
| Team members | 1 |
| Email retention | 48 hours |
| Spam analysis | ✅ Yes |
| HTML preview | ✅ Yes |

**Note:** 500 emails/month is plenty for development. If you need more, upgrade to Mailtrap's paid plan or switch to production (Resend).

---

## 🎓 Learn More

- Mailtrap Documentation: https://help.mailtrap.io
- Mailtrap API Docs: https://api-docs.mailtrap.io
- Video Tutorial: https://www.youtube.com/results?search_query=mailtrap+tutorial

---

## ❓ FAQ

**Q: Will my customers receive these emails?**
A: No! Mailtrap catches all emails. They never reach real inboxes. That's the point - safe testing!

**Q: Can I use Mailtrap in production?**
A: No. Mailtrap is for testing only. Use Resend or another service for production.

**Q: How long are emails kept?**
A: 48 hours on free tier, then automatically deleted.

**Q: Can I send emails from my actual domain with Mailtrap?**
A: No need! You can use any "from" address with Mailtrap since emails aren't actually delivered.

**Q: Is Mailtrap secure?**
A: Yes. Emails are private and only visible to you and your team members.

---

## ✅ Next Steps

After setting up Mailtrap:

1. ✅ Test invoice email sending thoroughly
2. ✅ Review email design and content
3. ✅ Fix any formatting issues
4. ✅ When ready, follow the Resend production setup guide
5. ✅ Get a domain for production email sending

**Ready for production?** See: [`docs/email-setup-resend.md`](./email-setup-resend.md)
