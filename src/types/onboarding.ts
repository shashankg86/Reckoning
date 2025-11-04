/**
 * Complete form data type for onboarding
 * This is the single source of truth for all onboarding form fields
 */
export type OnboardingFormData = {
  // Store basics
  name: string;
  type: 'restaurant' | 'cafe' | 'retail' | 'salon' | 'pharmacy' | 'other';
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  customCity?: string;
  gst_number?: string;

  // Contact info
  phone: string;
  secondary_phone?: string;
  email?: string;

  // Settings
  language: 'en' | 'hi' | 'ar' | 'mr';
  currency: 'INR' | 'USD' | 'EUR' | 'AED' | 'GBP';
  theme: 'light' | 'dark';
};
