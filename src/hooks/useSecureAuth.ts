import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sessionManager } from '../lib/sessionManager';
import toast from 'react-hot-toast';

interface SecureAuthOptions {
    requireRecentAuth?: boolean; // Require re-authentication if last auth > 5 minutes
    validateFingerprint?: boolean; // Validate session fingerprint
}

export function useSecureAuth() {
    const { state, logout } = useAuth();
    const [isValidating, setIsValidating] = useState(false);

    /**
     * Validate session before sensitive operation
     */
    const validateSession = useCallback(async (
        options: SecureAuthOptions = {}
    ): Promise<boolean> => {
        setIsValidating(true);

        try {
            // Check if user is authenticated
            if (!state.isAuthenticated || !state.user) {
                toast.error('Please log in to continue');
                return false;
            }

            // Validate fingerprint
            if (options.validateFingerprint !== false) {
                const isValid = sessionManager.validateSession();
                if (!isValid) {
                    toast.error('Security validation failed. Please log in again.');
                    await logout();
                    return false;
                }
            }

            // Check recent authentication (for sensitive operations)
            if (options.requireRecentAuth) {
                const lastLoginAt = state.user.lastLoginAt;
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

                if (lastLoginAt < fiveMinutesAgo) {
                    toast.error('Please re-authenticate to perform this action');
                    // You could redirect to a re-auth screen here
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('Session validation error:', error);
            return false;
        } finally {
            setIsValidating(false);
        }
    }, [state, logout]);

    /**
     * Extend current session (reset inactivity timer)
     */
    const extendSession = useCallback(() => {
        sessionManager.extendSession();
    }, []);

    return {
        validateSession,
        extendSession,
        isValidating,
    };
}