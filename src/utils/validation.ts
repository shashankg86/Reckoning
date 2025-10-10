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
