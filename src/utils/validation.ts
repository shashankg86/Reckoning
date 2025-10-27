/**
 * Email validation utility
 * Validates email format using RFC 5322 compliant regex
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const isFormatValid = emailRegex.test(email.trim());

  if (!isFormatValid) {
    return false;
  }

  const [localPart, domain] = email.split('@');

  if (localPart.length > 64 || domain.length > 255) {
    return false;
  }

  if (email.length > 320) {
    return false;
  }

  return true;
}

/**
 * Phone number validation
 * Accepts 10 digit numbers with optional country code
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  const cleaned = phone.replace(/\D/g, '');

  return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Password strength validation
 * Returns an object with validation results
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
} {
  const errors: string[] = [];
  let strength: 'weak' | 'medium' | 'strong' = 'weak';

  if (!password) {
    return { isValid: false, errors: ['Password is required'], strength: 'weak' };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length >= 8) {
    let strengthScore = 0;

    if (/[a-z]/.test(password)) strengthScore++;
    if (/[A-Z]/.test(password)) strengthScore++;
    if (/[0-9]/.test(password)) strengthScore++;
    if (/[^a-zA-Z0-9]/.test(password)) strengthScore++;

    if (strengthScore === 1) strength = 'weak';
    else if (strengthScore === 2 || strengthScore === 3) strength = 'medium';
    else if (strengthScore === 4) strength = 'strong';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Name validation
 * Ensures name has at least 2 characters and contains only letters and spaces
 */
export function isValidName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return false;
  }

  const nameRegex = /^[a-zA-Z\s\u0900-\u097F\u0600-\u06FF]+$/;
  return nameRegex.test(trimmed);
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, 500);
}

/**
 * Country-specific postal code validation patterns
 */
export const POSTAL_CODE_PATTERNS: Record<string, { pattern: RegExp; example: string; length?: number }> = {
  // India - 6 digit PIN code
  'India': {
    pattern: /^[1-9][0-9]{5}$/,
    example: '110001',
    length: 6
  },
  // United States - 5 digit ZIP or 5+4 format
  'United States': {
    pattern: /^\d{5}(-\d{4})?$/,
    example: '12345 or 12345-6789'
  },
  // United Kingdom - Alphanumeric postcode
  'United Kingdom': {
    pattern: /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i,
    example: 'SW1A 1AA'
  },
  // Canada - Alphanumeric postal code (A1A 1A1)
  'Canada': {
    pattern: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i,
    example: 'K1A 0B1'
  },
  // Australia - 4 digit postcode
  'Australia': {
    pattern: /^\d{4}$/,
    example: '2000',
    length: 4
  },
  // Germany - 5 digit postcode
  'Germany': {
    pattern: /^\d{5}$/,
    example: '10115',
    length: 5
  },
  // France - 5 digit postcode
  'France': {
    pattern: /^\d{5}$/,
    example: '75001',
    length: 5
  },
  // UAE - 5 digit postcode (optional)
  'United Arab Emirates': {
    pattern: /^\d{5}$/,
    example: '12345',
    length: 5
  },
  // China - 6 digit postcode
  'China': {
    pattern: /^\d{6}$/,
    example: '100000',
    length: 6
  },
  // Japan - 7 digit postcode (XXX-XXXX format)
  'Japan': {
    pattern: /^\d{3}-?\d{4}$/,
    example: '100-0001'
  }
};

/**
 * Validates postal code based on country
 */
export function validatePostalCode(postalCode: string, country: string): boolean {
  if (!postalCode || !country) return false;

  const countryValidation = POSTAL_CODE_PATTERNS[country];
  if (!countryValidation) {
    // Default validation for countries not in the list: 3-10 alphanumeric characters
    return /^[A-Z0-9\s-]{3,10}$/i.test(postalCode);
  }

  return countryValidation.pattern.test(postalCode);
}

/**
 * Gets the expected postal code format for a country
 */
export function getPostalCodeFormat(country: string): string {
  const countryValidation = POSTAL_CODE_PATTERNS[country];
  return countryValidation?.example || '3-10 characters';
}

/**
 * Validates GST number (Indian tax ID)
 * Format: 2 digits (state code) + 10 chars (PAN) + 1 digit (entity number) + 1 letter (Z by default) + 1 check digit
 */
export function validateGSTNumber(gst: string): boolean {
  if (!gst) return true; // Optional field

  // GST format: 15 characters - 2 digits, 10 alphanumeric (PAN), 1 digit, 1 letter, 1 alphanumeric
  const gstPattern = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstPattern.test(gst.toUpperCase());
}
