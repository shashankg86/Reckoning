import { Resend } from 'resend';

/**
 * Email Service using Resend
 *
 * IMPORTANT SECURITY NOTE:
 * This implementation uses client-side email sending which is NOT RECOMMENDED for production.
 * The Resend API key should be kept secret on the server.
 *
 * For Production:
 * - Create a Supabase Edge Function to handle email sending
 * - Store RESEND_API_KEY in Edge Function secrets
 * - Call the Edge Function from this service
 *
 * For Development/Testing:
 * - You can use VITE_RESEND_API_KEY (with VITE_ prefix to expose to client)
 * - This is acceptable for development but NOT for production
 */

// Initialize Resend with API key from environment variables
// For development: use VITE_RESEND_API_KEY
const apiKey = import.meta.env.VITE_RESEND_API_KEY || '';
const resend = new Resend(apiKey);

export interface InvoiceEmailData {
  to: string;
  invoiceNumber: string;
  customerName: string;
  storeName: string;
  storePhone?: string;
  storeEmail?: string;
  storeAddress?: string;
  items: {
    name: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  serviceCharge?: number;
  municipalityFee?: number;
  total: number;
  paymentMethod: string;
  date: string;
  taxComponents?: {
    name: string;
    rate: number;
    amount: number;
  }[];
}

export const emailService = {
  async sendInvoiceEmail(data: InvoiceEmailData) {
    try {
      const htmlContent = generateInvoiceHTML(data);

      const { data: result, error } = await resend.emails.send({
        from: 'Universal POS <noreply@yourdomain.com>', // Update with your verified domain
        to: [data.to],
        subject: `Invoice ${data.invoiceNumber} - ${data.storeName}`,
        html: htmlContent,
      });

      if (error) {
        throw new Error(error.message);
      }

      return result;
    } catch (error: any) {
      console.error('Email send error:', error);
      throw new Error(error.message || 'Failed to send email');
    }
  },
};

function generateInvoiceHTML(data: InvoiceEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoiceNumber}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .invoice-container {
      background: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 3px solid #FF6B35;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .store-name {
      font-size: 28px;
      font-weight: bold;
      color: #FF6B35;
      margin: 0 0 10px 0;
    }
    .store-details {
      color: #666;
      font-size: 14px;
    }
    .invoice-title {
      font-size: 24px;
      font-weight: bold;
      margin: 0 0 10px 0;
    }
    .invoice-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 6px;
    }
    .meta-item {
      margin-bottom: 8px;
    }
    .meta-label {
      color: #666;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-value {
      color: #333;
      font-size: 15px;
      font-weight: 500;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background: #f8f9fa;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #dee2e6;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #f0f0f0;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .totals-section {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #dee2e6;
    }
    .totals-table {
      width: 100%;
      max-width: 400px;
      margin-left: auto;
    }
    .totals-table td {
      border: none;
      padding: 8px 12px;
    }
    .totals-label {
      color: #666;
      font-size: 14px;
    }
    .totals-value {
      text-align: right;
      font-weight: 500;
      font-size: 14px;
    }
    .tax-component {
      font-size: 13px;
      color: #888;
      padding-left: 20px;
    }
    .total-row {
      font-size: 18px;
      font-weight: bold;
      background: #f8f9fa;
    }
    .total-row td {
      padding: 15px 12px;
      border-top: 2px solid #dee2e6;
    }
    .payment-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .payment-cash {
      background: #d4edda;
      color: #155724;
    }
    .payment-upi {
      background: #d1ecf1;
      color: #0c5460;
    }
    .payment-card {
      background: #fff3cd;
      color: #856404;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
      text-align: center;
      color: #666;
      font-size: 13px;
    }
    .thank-you {
      font-size: 20px;
      font-weight: 600;
      color: #FF6B35;
      margin-bottom: 10px;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .invoice-container {
        box-shadow: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <h1 class="store-name">${data.storeName}</h1>
      <div class="store-details">
        ${data.storePhone ? `<div>📞 ${data.storePhone}</div>` : ''}
        ${data.storeEmail ? `<div>📧 ${data.storeEmail}</div>` : ''}
        ${data.storeAddress ? `<div>📍 ${data.storeAddress}</div>` : ''}
      </div>
    </div>

    <!-- Invoice Title -->
    <h2 class="invoice-title">INVOICE</h2>

    <!-- Invoice Meta -->
    <div class="invoice-meta">
      <div>
        <div class="meta-item">
          <div class="meta-label">Invoice Number</div>
          <div class="meta-value">${data.invoiceNumber}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Date</div>
          <div class="meta-value">${data.date}</div>
        </div>
      </div>
      <div>
        <div class="meta-item">
          <div class="meta-label">Customer</div>
          <div class="meta-value">${data.customerName}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Payment Method</div>
          <div class="meta-value">
            <span class="payment-badge payment-${data.paymentMethod.toLowerCase()}">
              ${data.paymentMethod.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 50%">Item</th>
          <th class="text-center" style="width: 15%">Quantity</th>
          <th class="text-right" style="width: 17.5%">Price</th>
          <th class="text-right" style="width: 17.5%">Total</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map(item => `
        <tr>
          <td>${item.name}</td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-right">₹${item.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="text-right">₹${item.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Totals Section -->
    <div class="totals-section">
      <table class="totals-table">
        <tr>
          <td class="totals-label">Subtotal</td>
          <td class="totals-value">₹${data.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>

        ${data.serviceCharge && data.serviceCharge > 0 ? `
        <tr>
          <td class="totals-label">Service Charge</td>
          <td class="totals-value">₹${data.serviceCharge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        ` : ''}

        ${data.taxComponents && data.taxComponents.length > 0 ? `
        <tr>
          <td class="totals-label">Tax</td>
          <td class="totals-value">₹${data.tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        ${data.taxComponents.map(comp => `
        <tr>
          <td class="totals-label tax-component">${comp.name} (${comp.rate}%)</td>
          <td class="totals-value">₹${comp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        `).join('')}
        ` : `
        <tr>
          <td class="totals-label">Tax</td>
          <td class="totals-value">₹${data.tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        `}

        ${data.municipalityFee && data.municipalityFee > 0 ? `
        <tr>
          <td class="totals-label">Municipality Fee</td>
          <td class="totals-value">₹${data.municipalityFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        ` : ''}

        ${data.discount > 0 ? `
        <tr>
          <td class="totals-label">Discount</td>
          <td class="totals-value" style="color: #28a745;">-₹${data.discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        ` : ''}

        <tr class="total-row">
          <td class="totals-label">TOTAL</td>
          <td class="totals-value" style="color: #FF6B35;">₹${data.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="thank-you">Thank you for your business!</div>
      <p>This is a computer-generated invoice and does not require a signature.</p>
      <p>For any queries, please contact us at ${data.storeEmail || data.storePhone || ''}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
