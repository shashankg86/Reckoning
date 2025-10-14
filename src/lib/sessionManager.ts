/**
 * Session Manager
 * Handles session security, fingerprinting, and inactivity timeout
 */

import { supabase } from './supabaseClient';
import toast from 'react-hot-toast';

// Session configuration
const SESSION_CONFIG = {
    INACTIVITY_TIMEOUT: 15 * 60 * 1000, // 15 minutes
    WARNING_BEFORE_TIMEOUT: 2 * 60 * 1000, // Warn 2 minutes before logout
    TOKEN_REFRESH_MARGIN: 5 * 60 * 1000, // Refresh 5 minutes before expiry
};

class SessionManager {
    private inactivityTimer: NodeJS.Timeout | null = null;
    private warningTimer: NodeJS.Timeout | null = null;
    private tokenRefreshTimer: NodeJS.Timeout | null = null;
    private sessionFingerprint: string | null = null;
    private onSessionExpiredCallback: (() => void) | null = null;

    /**
     * Initialize session manager
     */
    initialize(onSessionExpired: () => void) {
        console.log('[SessionManager] Initializing...');
        this.onSessionExpiredCallback = onSessionExpired;

        // Generate session fingerprint
        this.generateFingerprint();

        // Setup activity listeners
        this.setupActivityListeners();

        // Setup token refresh
        this.setupTokenRefresh();

        // Verify session integrity
        this.verifySessionIntegrity();
    }

    /**
     * Generate browser fingerprint for session validation
     */
    private generateFingerprint(): void {
        const fingerprint = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            colorDepth: screen.colorDepth,
        };

        // Simple hash function
        const hash = JSON.stringify(fingerprint)
            .split('')
            .reduce((a, b) => {
                a = (a << 5) - a + b.charCodeAt(0);
                return a & a;
            }, 0);

        this.sessionFingerprint = hash.toString(36);
        sessionStorage.setItem('__sf__', this.sessionFingerprint);

        console.log('[SessionManager] Fingerprint generated');
    }

    /**
     * Verify session hasn't been hijacked
     */
    private verifySessionIntegrity(): boolean {
        const storedFingerprint = sessionStorage.getItem('__sf__');

        if (!storedFingerprint) {
            console.warn('[SessionManager] No fingerprint found');
            return false;
        }

        if (storedFingerprint !== this.sessionFingerprint) {
            console.error('[SessionManager] Session fingerprint mismatch - possible hijack');
            this.handleSessionHijack();
            return false;
        }

        return true;
    }

    /**
     * Handle potential session hijacking
     */
    private handleSessionHijack(): void {
        toast.error('Security alert: Session anomaly detected. Please log in again.');
        this.destroySession();
    }

    /**
     * Setup inactivity timeout
     */
    private setupActivityListeners(): void {
        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click',
        ];

        const resetInactivityTimer = () => {
            // Verify session before resetting
            if (!this.verifySessionIntegrity()) {
                return;
            }

            // Clear existing timers
            if (this.inactivityTimer) {
                clearTimeout(this.inactivityTimer);
            }
            if (this.warningTimer) {
                clearTimeout(this.warningTimer);
            }

            // Set warning timer (2 minutes before logout)
            this.warningTimer = setTimeout(() => {
                toast.warning('Your session will expire in 2 minutes due to inactivity', {
                    duration: 5000,
                });
            }, SESSION_CONFIG.INACTIVITY_TIMEOUT - SESSION_CONFIG.WARNING_BEFORE_TIMEOUT);

            // Set inactivity timer
            this.inactivityTimer = setTimeout(() => {
                console.log('[SessionManager] Session expired due to inactivity');
                toast.error('Session expired due to inactivity. Please log in again.');
                this.destroySession();
            }, SESSION_CONFIG.INACTIVITY_TIMEOUT);
        };

        // Attach event listeners
        events.forEach(event => {
            document.addEventListener(event, resetInactivityTimer, true);
        });

        // Initial timer setup
        resetInactivityTimer();

        console.log('[SessionManager] Activity listeners setup complete');
    }

    /**
     * Setup automatic token refresh
     */
    private setupTokenRefresh(): void {
        // Listen for auth state changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'TOKEN_REFRESHED') {
                console.log('[SessionManager] Token refreshed successfully');
                this.scheduleNextRefresh(session);
            }

            if (event === 'SIGNED_IN' && session) {
                console.log('[SessionManager] User signed in, scheduling token refresh');
                this.scheduleNextRefresh(session);
            }

            if (event === 'SIGNED_OUT') {
                console.log('[SessionManager] User signed out, clearing timers');
                this.cleanup();
            }
        });
    }

    /**
     * Schedule next token refresh before expiry
     */
    private scheduleNextRefresh(session: any): void {
        if (!session?.expires_at) return;

        // Clear existing refresh timer
        if (this.tokenRefreshTimer) {
            clearTimeout(this.tokenRefreshTimer);
        }

        // Calculate time until refresh (5 minutes before expiry)
        const expiresAt = session.expires_at * 1000;
        const now = Date.now();
        const timeUntilRefresh = expiresAt - now - SESSION_CONFIG.TOKEN_REFRESH_MARGIN;

        if (timeUntilRefresh > 0) {
            console.log(`[SessionManager] Token will refresh in ${Math.round(timeUntilRefresh / 1000)}s`);

            this.tokenRefreshTimer = setTimeout(async () => {
                try {
                    console.log('[SessionManager] Refreshing token...');
                    const { error } = await supabase.auth.refreshSession();

                    if (error) {
                        console.error('[SessionManager] Token refresh failed:', error);
                        toast.error('Session refresh failed. Please log in again.');
                        this.destroySession();
                    }
                } catch (error) {
                    console.error('[SessionManager] Token refresh error:', error);
                    this.destroySession();
                }
            }, timeUntilRefresh);
        } else {
            console.warn('[SessionManager] Token already expired or about to expire');
            this.destroySession();
        }
    }

    /**
     * Destroy session and trigger logout
     */
    private destroySession(): void {
        console.log('[SessionManager] Destroying session');

        // Clear all timers
        this.cleanup();

        // Trigger logout callback
        if (this.onSessionExpiredCallback) {
            this.onSessionExpiredCallback();
        }
    }

    /**
     * Cleanup all timers and listeners
     */
    cleanup(): void {
        console.log('[SessionManager] Cleaning up...');

        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }

        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
            this.warningTimer = null;
        }

        if (this.tokenRefreshTimer) {
            clearTimeout(this.tokenRefreshTimer);
            this.tokenRefreshTimer = null;
        }
    }

    /**
     * Manual session validation (call on sensitive operations)
     */
    validateSession(): boolean {
        return this.verifySessionIntegrity();
    }

    /**
     * Extend session (reset inactivity timer)
     */
    extendSession(): void {
        // Trigger a dummy event to reset inactivity timer
        document.dispatchEvent(new Event('click'));
    }
}

export const sessionManager = new SessionManager();