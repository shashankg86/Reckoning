/**
 * WhatsApp Service
 *
 * IMPORTANT: WhatsApp Business API is NOT FREE
 *
 * Options:
 * 1. Official WhatsApp Business API (Recommended but Paid)
 *    - Cost: ~₹0.40-1.50 per message (India), $0.005-0.05 (other countries)
 *    - Providers: Twilio, MessageBird, 360Dialog
 *    - Reliable, official, won't get banned
 *
 * 2. Unofficial Libraries (Free but Risky - NOT RECOMMENDED)
 *    - whatsapp-web.js, Baileys
 *    - Free but against WhatsApp ToS
 *    - Account can be banned
 *    - Not reliable for business
 *
 * 3. Alternative: Use SMS instead (Twilio has free trial)
 *    - More reliable than unofficial WhatsApp
 *    - Costs similar to official WhatsApp
 *
 * Current Implementation: PLACEHOLDER
 * - Email invoices are sent immediately (free)
 * - WhatsApp can be added later when you have budget
 */

export interface WhatsAppInvoiceData {
  to: string; // Phone number with country code (+919876543210)
  storeName: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  paymentMethod: string;
  invoiceLink?: string; // Optional link to view invoice online
}

export const whatsappService = {
  /**
   * Send invoice via WhatsApp (PLACEHOLDER)
   *
   * To implement:
   * 1. Sign up for WhatsApp Business API (Twilio, 360Dialog, etc.)
   * 2. Get API credentials
   * 3. Add credentials to .env file
   * 4. Uncomment and implement the code below
   */
  async sendInvoiceWhatsApp(data: WhatsAppInvoiceData): Promise<{ success: boolean; message: string }> {
    // PLACEHOLDER: Log instead of sending
    console.log('📱 WhatsApp Invoice (Not Sent - Placeholder):', {
      to: data.to,
      storeName: data.storeName,
      invoiceNumber: data.invoiceNumber,
      customerName: data.customerName,
      total: data.total,
    });

    // Return success for now (no actual sending)
    return {
      success: true,
      message: 'WhatsApp sending is not configured. Invoice sent via email instead.',
    };

    /*
    // EXAMPLE: Twilio WhatsApp Integration (Uncomment when ready)

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER; // e.g., whatsapp:+14155238886

    if (!accountSid || !authToken || !twilioWhatsAppNumber) {
      throw new Error('Twilio WhatsApp credentials not configured');
    }

    const twilio = require('twilio')(accountSid, authToken);

    const message = `
🧾 *Invoice from ${data.storeName}*

Hello ${data.customerName}!

Thank you for your purchase.

*Invoice Number:* ${data.invoiceNumber}
*Total Amount:* ₹${data.total.toLocaleString('en-IN')}
*Payment Method:* ${data.paymentMethod.toUpperCase()}

${data.invoiceLink ? `View Invoice: ${data.invoiceLink}` : ''}

Thank you for your business! 🙏
    `.trim();

    try {
      const result = await twilio.messages.create({
        from: twilioWhatsAppNumber,
        body: message,
        to: `whatsapp:${data.to}`,
      });

      return {
        success: true,
        message: 'WhatsApp message sent successfully',
      };
    } catch (error: any) {
      console.error('WhatsApp send error:', error);
      throw new Error(error.message || 'Failed to send WhatsApp message');
    }
    */

    /*
    // EXAMPLE: 360Dialog WhatsApp Integration (Uncomment when ready)

    const apiKey = process.env.WHATSAPP_360_API_KEY;
    const namespace = process.env.WHATSAPP_360_NAMESPACE;

    if (!apiKey || !namespace) {
      throw new Error('360Dialog credentials not configured');
    }

    const message = {
      to: data.to,
      type: 'template',
      template: {
        namespace: namespace,
        name: 'invoice_notification', // You need to create this template in 360Dialog
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: data.customerName },
              { type: 'text', text: data.invoiceNumber },
              { type: 'text', text: `₹${data.total.toLocaleString('en-IN')}` },
            ],
          },
        ],
      },
    };

    try {
      const response = await fetch('https://waba.360dialog.io/v1/messages', {
        method: 'POST',
        headers: {
          'D360-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error('Failed to send WhatsApp message');
      }

      return {
        success: true,
        message: 'WhatsApp message sent successfully',
      };
    } catch (error: any) {
      console.error('WhatsApp send error:', error);
      throw new Error(error.message || 'Failed to send WhatsApp message');
    }
    */
  },

  /**
   * Check if WhatsApp is configured
   */
  isConfigured(): boolean {
    // Check if any WhatsApp credentials are set
    const hasTwilio = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
    const has360Dialog = !!process.env.WHATSAPP_360_API_KEY;

    return hasTwilio || has360Dialog;
  },
};
