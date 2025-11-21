
/**
 * Email Service using Supabase Edge Functions + Resend
 *
 * This service calls a Supabase Edge Function which securely sends emails via Resend.
 * The Resend API key is stored in Edge Function secrets (not exposed to the client).
 *
 * Architecture:
 * Browser → emailService.sendInvoiceEmail() → Supabase Edge Function → Resend API → Customer Email
 *
 * Benefits:
 * ✅ API key stays secure on server
 * ✅ No CORS issues
 * ✅ Free tier: 3,000 emails/month via Resend
 * ✅ Easy to monitor and debug via Supabase Dashboard
 */

import { supabase } from "../lib/supabaseClient";

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
      // Use dev function for development (Mailtrap - no domain needed)
      // Use production function for production (Resend - requires verified domain)
      const isDevelopment = import.meta.env.DEV || import.meta.env.VITE_EMAIL_MODE === 'dev';
      const functionName = isDevelopment ? 'email-invoice-dev' : 'email-invoice';

      console.log(`Sending email via ${functionName} (${isDevelopment ? 'Development/Mailtrap' : 'Production/Resend'})`);

      // Call the Supabase Edge Function to send the email
      const { data: result, error } = await supabase.functions.invoke(functionName, {
        body: data,
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw new Error(error.message || 'Failed to send email via Edge Function');
      }

      if (!result || !result.success) {
        throw new Error(result?.error || 'Failed to send invoice email');
      }

      return result.data;
    } catch (error: any) {
      console.error('Email send error:', error);
      throw new Error(error.message || 'Failed to send email');
    }
  },
};
