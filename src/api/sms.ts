import toast from 'react-hot-toast';

interface SMSConfig {
  authKey: string;
  templateId: string;
  sender: string;
  route: string;
}

interface OTPResponse {
  success: boolean;
  message: string;
  data?: any;
}

class SMSService {
  private config: SMSConfig;
  private baseURL = 'https://api.msg91.com/api/v5';

  constructor() {
    this.config = {
      authKey: import.meta.env.VITE_MSG91_AUTH_KEY || '',
      templateId: import.meta.env.VITE_MSG91_TEMPLATE_ID || '',
      sender: import.meta.env.VITE_MSG91_SENDER || 'RECKNG',
      route: '4', // Transactional route
    };

    if (!this.config.authKey) {
      console.warn('[SMS] MSG91 Auth Key not configured. SMS features will be disabled.');
    }
  }

  /**
   * Send OTP to phone number using MSG91
   */
  async sendOTP(phone: string, otpLength: number = 6): Promise<OTPResponse> {
    try {
      if (!this.config.authKey) {
        throw new Error('SMS service not configured. Please add MSG91 credentials to environment.');
      }

      // Clean phone number (remove +91 or other country codes)
      const cleanPhone = this.cleanPhoneNumber(phone);
      
      console.log('[SMS] Sending OTP to:', cleanPhone);

      const payload = {
        template_id: this.config.templateId,
        sender: this.config.sender,
        short_url: '0',
        mobiles: `91${cleanPhone}`, // Add country code for India
        var1: this.generateOTP(otpLength), // Generate OTP
        var2: 'Reckoning POS', // App name
        route: this.config.route,
      };

      const response = await fetch(`${this.baseURL}/otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authkey': this.config.authKey,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.type === 'success') {
        console.log('[SMS] OTP sent successfully:', result);
        
        // Store OTP temporarily for verification (in production, this should be server-side)
        this.storeOTPTemporarily(cleanPhone, payload.var1);
        
        return {
          success: true,
          message: 'OTP sent successfully',
          data: result,
        };
      } else {
        throw new Error(result.message || 'Failed to send OTP');
      }
    } catch (error: any) {
      console.error('[SMS] Error sending OTP:', error);
      return {
        success: false,
        message: error.message || 'Failed to send OTP. Please try again.',
      };
    }
  }

  /**
   * Verify OTP entered by user
   */
  async verifyOTP(phone: string, enteredOTP: string): Promise<OTPResponse> {
    try {
      const cleanPhone = this.cleanPhoneNumber(phone);
      const storedOTP = this.getStoredOTP(cleanPhone);

      console.log('[SMS] Verifying OTP for:', cleanPhone);

      if (!storedOTP) {
        return {
          success: false,
          message: 'OTP expired or not found. Please request a new OTP.',
        };
      }

      if (storedOTP.otp === enteredOTP) {
        // Check if OTP is still valid (5 minutes)
        const now = Date.now();
        const otpAge = now - storedOTP.timestamp;
        const maxAge = 5 * 60 * 1000; // 5 minutes

        if (otpAge > maxAge) {
          this.clearStoredOTP(cleanPhone);
          return {
            success: false,
            message: 'OTP expired. Please request a new OTP.',
          };
        }

        // OTP is valid
        this.clearStoredOTP(cleanPhone);
        console.log('[SMS] OTP verified successfully');
        
        return {
          success: true,
          message: 'Phone number verified successfully!',
        };
      } else {
        return {
          success: false,
          message: 'Invalid OTP. Please check and try again.',
        };
      }
    } catch (error: any) {
      console.error('[SMS] Error verifying OTP:', error);
      return {
        success: false,
        message: error.message || 'Failed to verify OTP. Please try again.',
      };
    }
  }

  /**
   * Clean phone number (remove country code, spaces, special chars)
   */
  private cleanPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, ''); // Remove all non-digits
    
    // Remove country code if present
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      cleaned = cleaned.substring(2);
    }
    
    return cleaned;
  }

  /**
   * Generate random OTP
   */
  private generateOTP(length: number): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  /**
   * Temporarily store OTP in localStorage (in production, this should be server-side)
   */
  private storeOTPTemporarily(phone: string, otp: string): void {
    const otpData = {
      otp,
      timestamp: Date.now(),
    };
    localStorage.setItem(`otp_${phone}`, JSON.stringify(otpData));
  }

  /**
   * Get stored OTP from localStorage
   */
  private getStoredOTP(phone: string): { otp: string; timestamp: number } | null {
    try {
      const stored = localStorage.getItem(`otp_${phone}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Clear stored OTP
   */
  private clearStoredOTP(phone: string): void {
    localStorage.removeItem(`otp_${phone}`);
  }

  /**
   * Check if SMS service is configured
   */
  isConfigured(): boolean {
    return !!this.config.authKey && !!this.config.templateId;
  }

  /**
   * Resend OTP (with rate limiting)
   */
  async resendOTP(phone: string): Promise<OTPResponse> {
    const cleanPhone = this.cleanPhoneNumber(phone);
    const lastSent = localStorage.getItem(`otp_last_sent_${cleanPhone}`);
    
    if (lastSent) {
      const timeSinceLastSent = Date.now() - parseInt(lastSent);
      const cooldown = 60 * 1000; // 1 minute cooldown
      
      if (timeSinceLastSent < cooldown) {
        const remainingTime = Math.ceil((cooldown - timeSinceLastSent) / 1000);
        return {
          success: false,
          message: `Please wait ${remainingTime} seconds before requesting another OTP.`,
        };
      }
    }

    const result = await this.sendOTP(phone);
    
    if (result.success) {
      localStorage.setItem(`otp_last_sent_${cleanPhone}`, Date.now().toString());
    }
    
    return result;
  }
}

// Export singleton instance
export const smsAPI = new SMSService();

// Export types for use in components
export type { OTPResponse };