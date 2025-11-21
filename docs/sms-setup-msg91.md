# SMS Setup Guide - MSG91

## 📱 What is MSG91?

MSG91 is an India-focused communication platform for SMS, OTP, WhatsApp, and Voice calls. It's the most popular SMS service for Indian businesses.

### Benefits:
- ✅ **Cheapest SMS rates in India** (₹0.15-0.25 per SMS)
- ✅ **High delivery rate** in India (~98%)
- ✅ **OTP templates included** (pre-approved)
- ✅ **24/7 Indian support** (Hindi & English)
- ✅ **Free trial credits** for testing
- ✅ **DLT registration help** (required in India)
- ✅ **WhatsApp Business API** available on same platform

### Use Cases in Your App:
- 🔐 OTP verification during signup/login
- 📧 Backup when email fails
- 📱 Send invoice links via SMS
- ✅ Order confirmation messages
- 🔔 Important notifications

---

## 🚀 Complete Setup Guide

### Phase 1: Create MSG91 Account

1. Go to https://msg91.com
2. Click **"Sign Up"** (top right)
3. Fill in details:
   - Full Name
   - Email Address
   - Mobile Number (Indian number preferred)
   - Company Name
   - Password
4. Click **"Sign Up"**
5. Verify your email (check inbox for verification link)
6. Verify your mobile number (OTP will be sent)

**Free Credits:**
- You'll get **₹20-50 free credits** to test
- Enough for ~100-200 test SMS

---

### Phase 2: Complete KYC (Required in India)

India requires **DLT (Distributed Ledger Technology) registration** for commercial SMS.

#### Step 2.1: Basic KYC

1. Login to MSG91 dashboard
2. Go to **"Settings"** → **"Account Settings"**
3. Upload documents:
   - **Aadhaar Card** (for individual)
   - **GST Certificate** (for business)
   - **PAN Card**
   - **Cancelled Cheque** (for bank verification)

4. Wait for approval (2-24 hours)

#### Step 2.2: DLT Registration (For Production)

**What is DLT?**
- Government-mandated spam prevention system
- Required to send commercial SMS in India
- One-time registration (~₹500-1000)

**DLT Registration Steps:**

1. In MSG91 dashboard, go to **"DLT"** section
2. Click **"Register New Entity"**
3. MSG91 will guide you through the process
4. You'll need:
   - Business registration documents
   - GST certificate
   - PAN card
   - Sample SMS templates

5. Pay registration fee (~₹500-1000 one-time)
6. Wait for approval (3-7 days)

**Important:** DLT is required for production. You can use test credits without DLT for development.

---

### Phase 3: Get API Credentials

#### Step 3.1: Get Auth Key

1. Login to MSG91 dashboard
2. Go to **"Settings"** → **"API Keys"**
3. You'll see your **Auth Key** (also called API Key)
   - Example: `123456ABCDEFGHIJKLMNOP789`
4. Copy this key - you'll need it

#### Step 3.2: Get Sender ID

**What is Sender ID?**
- The name that appears as sender (e.g., "RECKNG", "MYSHOP")
- 6 characters max
- No spaces, all uppercase

**How to get:**

1. In MSG91 dashboard, go to **"Manage"** → **"Sender IDs"**
2. Click **"Add Sender ID"**
3. Enter your desired sender ID:
   - Example: `RECKNG` (for "Reckoning")
   - Example: `NEXLUM` (for "Nexlumo")
4. Select purpose: **"Transactional"**
5. Upload required documents (business proof)
6. Submit for approval
7. Wait 2-24 hours for approval

**Default Sender ID:**
- For testing, use: `RECKNG` (already configured in your code)
- Change later when your custom sender ID is approved

---

### Phase 4: Create OTP Template

India requires pre-approved SMS templates.

#### Step 4.1: Create Template

1. Go to **"Manage"** → **"Templates"**
2. Click **"Create New Template"**
3. Fill in details:

**Template Name:** OTP Verification

**Template Content:**
```
Your OTP for Reckoning login is {#var#}. Valid for 10 minutes. Do not share this code with anyone.
```

**Variables:**
- Add variable: `{#var#}` (this will be replaced with actual OTP)

**Template Type:** Transactional

**Category:** OTP

4. Click **"Submit for Approval"**
5. Wait for approval (2-24 hours)

#### Step 4.2: Get Template ID

Once approved:
1. Go to **"Templates"** page
2. Find your template
3. Copy the **Template ID** (DLT Template ID)
   - Example: `1234567890123456789`
4. Save this ID - you'll need it

---

### Phase 5: Configure Your Application

#### Step 5.1: Set Environment Variables

Edit your `.env` file:

```bash
# MSG91 Configuration
VITE_MSG91_AUTH_KEY=your_auth_key_here
VITE_MSG91_TEMPLATE_ID=your_template_id_here
VITE_MSG91_SENDER=RECKNG

# Example (with actual values):
# VITE_MSG91_AUTH_KEY=123456ABCDEFGHIJKLMNOP789
# VITE_MSG91_TEMPLATE_ID=1234567890123456789
# VITE_MSG91_SENDER=RECKNG
```

Replace:
- `your_auth_key_here` with Auth Key from Phase 3.1
- `your_template_id_here` with Template ID from Phase 4.2
- `RECKNG` with your approved Sender ID (or keep RECKNG for testing)

#### Step 5.2: Verify Integration

Your code already has MSG91 integration in:
- File: `src/api/sms.ts`

**Check the code:**
```typescript
// This is already implemented in your project
export const smsAPI = {
  async sendOTP(phoneNumber: string) {
    // Uses MSG91 to send OTP
  },

  async verifyOTP(phoneNumber: string, otp: string) {
    // Verifies OTP
  }
};
```

---

### Phase 6: Test SMS Sending

#### Step 6.1: Test in Development

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to login/signup page

3. Enter a mobile number (use your own for testing)

4. Click "Send OTP"

5. You should receive an SMS with OTP on your phone

6. Enter the OTP and verify

#### Step 6.2: Test in MSG91 Dashboard

**Alternative testing method:**

1. Go to MSG91 dashboard
2. Click **"Test SMS"** or **"Send SMS"**
3. Select your template
4. Enter mobile number
5. Enter variable value (OTP code)
6. Click "Send"
7. Check your phone

---

## 📊 SMS Pricing (India)

### MSG91 Pricing Tiers:

| Volume | Cost per SMS | Monthly Cost (for reference) |
|--------|-------------|------------------------------|
| 0 - 10,000 | ₹0.25 | ₹2,500 |
| 10,000 - 50,000 | ₹0.20 | ₹4,000 - ₹10,000 |
| 50,000 - 100,000 | ₹0.18 | ₹9,000 - ₹18,000 |
| 100,000+ | ₹0.15 | ₹15,000+ |

### Cost Examples:

**Scenario 1: Startup (100 signups/day)**
```
OTP per signup: 1 SMS
Daily cost: 100 × ₹0.25 = ₹25
Monthly cost: ₹750
```

**Scenario 2: Growing Business (500 signups/day)**
```
OTP per signup: 1 SMS
Daily cost: 500 × ₹0.25 = ₹125
Monthly cost: ₹3,750
```

**Scenario 3: Established Business (2000 signups/day)**
```
OTP per signup: 1 SMS
Daily cost: 2000 × ₹0.20 = ₹400
Monthly cost: ₹12,000
```

### Additional Costs:

| Service | Cost |
|---------|------|
| DLT Registration | ₹500-1000 (one-time) |
| Sender ID approval | Free |
| Template creation | Free |
| Failed SMS | Not charged |
| International SMS | ₹2-10 per SMS |

---

## 🔧 Advanced Configuration

### Multiple Templates

Create different templates for different use cases:

**Template 1: Login OTP**
```
Your login OTP is {#var#}. Valid for 10 minutes. - Team Reckoning
```

**Template 2: Invoice Link**
```
Your invoice #{#var#} is ready. View: {#var#}. Thank you for your business!
```

**Template 3: Order Confirmation**
```
Order #{#var#} confirmed! Amount: ₹{#var#}. Track: {#var#}. Thanks!
```

### International SMS

To send SMS to non-Indian numbers:

1. Enable international SMS in MSG91 settings
2. Rates are higher (₹2-10 per SMS depending on country)
3. Update your code to handle country codes:

```typescript
// Example for international numbers
const phoneNumber = "+1-555-123-4567"; // US number
const phoneNumber = "+971-50-123-4567"; // UAE number
const phoneNumber = "+91-98765-43210"; // India (standard)
```

---

## 🐛 Troubleshooting

### Problem: "Invalid Auth Key"

**Solutions:**
1. Check if Auth Key is correct in `.env` file
2. Ensure no extra spaces or quotes
3. Regenerate Auth Key in MSG91 dashboard:
   - Settings → API Keys → Regenerate
4. Update `.env` with new key
5. Restart your development server

### Problem: "Template not found"

**Solutions:**
1. Verify template is approved in MSG91 dashboard
2. Check Template ID is correct in `.env`
3. Ensure template variables match your code
4. Wait for template approval (if recently created)

### Problem: "SMS not delivered"

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Phone number format wrong | Use format: 919876543210 (country code + number, no spaces) |
| Insufficient credits | Recharge account in MSG91 dashboard |
| DND (Do Not Disturb) enabled | Cannot send promotional SMS to DND numbers (OTP still works) |
| Phone number blacklisted | Contact MSG91 support |
| Network issues | Retry after few minutes |

### Problem: "DLT Registration Rejected"

**Common reasons:**
1. Incomplete documents
2. Mismatch in business name
3. Template content doesn't follow guidelines

**Solutions:**
- Review rejection reason in MSG91 dashboard
- Update documents/information
- Contact MSG91 support for help
- Use their DLT registration assistance service

### Problem: High SMS failure rate

**Check:**
1. Phone number format is correct
2. Numbers are Indian (for DLT compliance)
3. Credits are sufficient
4. Sender ID is approved
5. Template is approved

**Monitor in MSG91 dashboard:**
- Go to Reports → SMS Reports
- Check delivery status for each SMS
- Look for error codes

---

## 📈 Monitoring & Analytics

### MSG91 Dashboard Analytics:

1. **SMS Reports:**
   - Go to Reports → SMS Reports
   - See all sent SMS with status
   - Filter by date, status, number

2. **Delivery Analytics:**
   - Delivery rate (%)
   - Failed SMS count
   - Error codes breakdown
   - Route-wise analytics

3. **Credit Balance:**
   - Dashboard shows current balance
   - Set up low balance alerts
   - Auto-recharge option available

4. **API Usage:**
   - API call statistics
   - Peak usage times
   - Error rate

### Setting Up Alerts:

1. Go to Settings → Notifications
2. Enable alerts for:
   - Low balance (₹100)
   - High failure rate (>5%)
   - API errors
3. Set email/SMS notifications

---

## 🔒 Security Best Practices

### API Key Security:

✅ **DO:**
- Store Auth Key in environment variables only
- Never commit Auth Key to Git
- Use different Auth Keys for dev/production
- Rotate Auth Keys periodically (every 90 days)
- Restrict API access to specific IPs (in MSG91 settings)

❌ **DON'T:**
- Share Auth Key publicly
- Store Auth Key in frontend code
- Use production Auth Key in development
- Send Auth Key via email/chat

### OTP Security:

✅ **DO:**
- Set OTP expiry (10 minutes recommended)
- Limit OTP attempts (max 3-5)
- Use 6-digit OTPs
- Rate-limit OTP requests (1 per minute per number)
- Log OTP requests for security audit

❌ **DON'T:**
- Use predictable OTPs (sequential numbers)
- Send OTP via email AND SMS (choose one)
- Allow unlimited OTP requests
- Store OTPs in plain text

### Phone Number Validation:

```typescript
// Example validation in your code
function isValidIndianNumber(phone: string): boolean {
  // Indian mobile numbers: 10 digits starting with 6-9
  const pattern = /^[6-9]\d{9}$/;
  return pattern.test(phone);
}
```

---

## 💡 Optimization Tips

### Reduce SMS Costs:

1. **Use OTP only when necessary**
   - Allow email-only signup option
   - Use OTP only for sensitive actions

2. **Implement rate limiting**
   - Prevent spam OTP requests
   - Save costs on failed attempts

3. **Batch SMS sending**
   - Send promotional SMS in batches during off-peak hours
   - Lower rates sometimes available

4. **Verify phone before sending**
   - Check number format before API call
   - Don't waste credits on invalid numbers

5. **Use MSG91 credit balance alerts**
   - Recharge before balance hits zero
   - Avoid service disruption

### Improve Delivery Rates:

1. **Use correct phone number format**
   - Format: 919876543210 (country code + 10 digits)
   - No spaces, no special characters

2. **Choose right template type**
   - Transactional: High priority, bypass DND
   - Promotional: Lower priority, affected by DND

3. **Get approved Sender ID**
   - Increases trust
   - Better delivery rates
   - Professional appearance

4. **Follow DLT guidelines**
   - Use approved templates only
   - Don't modify template content
   - Include required disclaimers

---

## 🎓 Learn More

**MSG91 Resources:**
- Documentation: https://docs.msg91.com
- API Reference: https://docs.msg91.com/reference
- Video Tutorials: https://www.youtube.com/@MSG91
- Support: support@msg91.com

**DLT Information:**
- TRAI DLT Portal: https://www.dltconnect.org
- DLT Guidelines: https://trai.gov.in
- MSG91 DLT Help: https://msg91.com/dlt

**Best Practices:**
- SMS Best Practices Guide: https://msg91.com/guides/sms-best-practices
- OTP Security: https://msg91.com/guides/otp-security
- DLT Compliance: https://msg91.com/dlt-guide

---

## 🆘 Getting Help

**MSG91 Support:**
- Email: support@msg91.com
- Phone: +91-120-6471200
- WhatsApp: +91-9560344455
- Live Chat: Available on dashboard 24/7

**Support Response Time:**
- Email: 2-4 hours
- Phone: Immediate
- WhatsApp: 30 minutes - 2 hours
- Live Chat: 5-15 minutes

**Community:**
- MSG91 Facebook Group
- Stack Overflow: Tag `msg91`
- Developer Forum: https://forum.msg91.com

---

## 📋 Production Checklist

Before going live with SMS:

### Account Setup:
- [ ] MSG91 account created and verified
- [ ] KYC documents uploaded and approved
- [ ] DLT registration completed (if required)
- [ ] Sufficient credits added to account
- [ ] Low balance alerts configured

### Configuration:
- [ ] Auth Key added to environment variables
- [ ] Sender ID approved and active
- [ ] OTP template created and approved
- [ ] Template ID added to configuration
- [ ] Phone number format validation implemented

### Testing:
- [ ] Test OTP sending to your number
- [ ] Test with multiple Indian mobile numbers
- [ ] Test OTP verification flow
- [ ] Test error handling (invalid numbers, etc.)
- [ ] Verify SMS delivery time (should be <5 seconds)

### Security:
- [ ] Rate limiting implemented (prevent spam)
- [ ] OTP expiry set (10 minutes)
- [ ] Maximum OTP attempts limited (3-5)
- [ ] Auth Key not exposed in frontend
- [ ] Logs set up for security audit

### Monitoring:
- [ ] SMS delivery monitoring enabled
- [ ] Failure alerts configured
- [ ] Credit balance alerts set
- [ ] API error logging implemented
- [ ] Daily/weekly reports scheduled

---

## 🚀 Next Steps

After SMS setup:

1. ✅ Test OTP flow thoroughly in development
2. ✅ Complete DLT registration for production
3. ✅ Get custom Sender ID approved
4. ✅ Set up credit auto-recharge
5. ✅ Implement rate limiting
6. ✅ Consider WhatsApp Business API for invoices
7. ✅ Monitor delivery rates daily for first week

**Ready for WhatsApp?** MSG91 offers WhatsApp Business API on the same platform! Contact their sales team for WhatsApp setup.

---

## 💬 WhatsApp Business API (Optional)

MSG91 also provides WhatsApp Business API for richer messaging:

### Benefits over SMS:
- ✅ Send images, PDFs, buttons
- ✅ Higher engagement rates
- ✅ Multimedia invoice receipts
- ✅ Two-way conversations
- ✅ Delivery receipts and read receipts

### Cost:
- ₹0.35-0.50 per message (India)
- Slightly higher than SMS but better engagement

### Setup:
- Contact MSG91 sales: sales@msg91.com
- Complete WhatsApp Business verification
- Get WhatsApp Business API access
- Use same MSG91 dashboard

**Want to add WhatsApp?** Ask your MSG91 account manager about WhatsApp Business API integration!
