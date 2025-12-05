/**
 * Accept Invite Screen
 *
 * Public screen for accepting staff invitations.
 * Handles three scenarios:
 * 1. User not logged in - show login/signup options
 * 2. User logged in with matching email - show accept button
 * 3. User logged in with different email - show warning
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BuildingStorefrontIcon,
  UserCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightOnRectangleIcon,
  UserPlusIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { invitationsAPI } from '@/api/invitations';
import { LoadingScreen } from '@/components/ui/Loader';
import { Button } from '@/components/ui/Button';
import { BRAND } from '@/constants/branding';
import type { InviteDetails, StoreRole } from '@/types/staff';

// Store pending invite token for post-auth acceptance
const PENDING_INVITE_KEY = 'pending_invite_token';

export function storePendingInvite(token: string) {
  sessionStorage.setItem(PENDING_INVITE_KEY, token);
}

export function getPendingInvite(): string | null {
  return sessionStorage.getItem(PENDING_INVITE_KEY);
}

export function clearPendingInvite() {
  sessionStorage.removeItem(PENDING_INVITE_KEY);
}

// Role badge colors
const ROLE_COLORS: Record<StoreRole, string> = {
  owner: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cashier: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  waiter: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

export function AcceptInviteScreen() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state: authState, logout } = useAuth();

  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState(false);

  // Fetch invite details
  useEffect(() => {
    async function fetchInvite() {
      if (!token) {
        setError(t('invite.invalidToken'));
        setIsLoading(false);
        return;
      }

      try {
        const details = await invitationsAPI.getInviteByToken(token);
        setInviteDetails(details);

        if (!details.valid) {
          setError(details.error || t('invite.invalidOrExpired'));
        }
      } catch (err) {
        console.error('Error fetching invite:', err);
        setError(t('invite.fetchError'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchInvite();
  }, [token, t]);

  // Check if logged in user's email matches invite
  const currentUserEmail = authState.user?.email?.toLowerCase();
  const inviteEmail = inviteDetails?.invite?.email?.toLowerCase();
  const emailsMatch = currentUserEmail && inviteEmail && currentUserEmail === inviteEmail;
  const isLoggedIn = authState.isAuthenticated;

  // Handle accept invitation
  const handleAccept = async () => {
    if (!token) return;

    setIsAccepting(true);
    try {
      const result = await invitationsAPI.acceptInvite(token);

      if (result.success) {
        setAcceptSuccess(true);
        clearPendingInvite();

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          // Force reload to get updated memberships
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        setError(result.error || t('invite.acceptError'));
      }
    } catch (err: any) {
      setError(err.message || t('invite.acceptError'));
    } finally {
      setIsAccepting(false);
    }
  };

  // Handle login navigation
  const handleLogin = () => {
    if (token) {
      storePendingInvite(token);
    }
    navigate('/login', {
      state: { email: inviteDetails?.invite?.email },
    });
  };

  // Handle signup navigation
  const handleSignup = () => {
    if (token) {
      storePendingInvite(token);
    }
    navigate('/signup', {
      state: { email: inviteDetails?.invite?.email },
    });
  };

  // Handle logout to switch accounts
  const handleLogout = async () => {
    if (token) {
      storePendingInvite(token);
    }
    await logout();
    navigate('/login', {
      state: { email: inviteDetails?.invite?.email },
    });
  };

  // Loading state
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Success state
  if (acceptSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircleIcon className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('invite.welcomeToTeam')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('invite.successMessage', { storeName: inviteDetails?.store?.name })}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {t('invite.redirecting')}
          </p>
        </div>
      </div>
    );
  }

  // Error state (invalid/expired invite)
  if (error || !inviteDetails?.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <ExclamationTriangleIcon className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('invite.invalidTitle')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || inviteDetails?.error || t('invite.invalidOrExpired')}
          </p>
          <div className="space-y-3">
            <Button onClick={() => navigate('/login')} className="w-full">
              {t('invite.goToLogin')}
            </Button>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {t('invite.contactAdmin')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Valid invite - show details
  const { invite, store, inviter } = inviteDetails;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-orange-500 p-6 text-white text-center">
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
            {store?.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <BuildingStorefrontIcon className="h-8 w-8" />
            )}
          </div>
          <h1 className="text-2xl font-bold mb-1">
            {t('invite.youreInvited')}
          </h1>
          <p className="text-orange-100">
            {t('invite.joinTeamAt', { storeName: store?.name })}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Invite Details */}
          <div className="space-y-4">
            {/* Role */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400">
                {t('invite.yourRole')}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${ROLE_COLORS[invite?.role || 'cashier']}`}>
                {t(`roles.${invite?.role}`)}
              </span>
            </div>

            {/* Invited By */}
            {inviter && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('invite.invitedBy')}
                </span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {inviter.name || inviter.email}
                </span>
              </div>
            )}

            {/* Expires */}
            {invite?.expires_at && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <span className="flex items-center text-gray-600 dark:text-gray-400">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  {t('invite.expiresOn')}
                </span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(invite.expires_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {isLoggedIn ? (
            // User is logged in
            emailsMatch ? (
              // Email matches - show accept button
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <UserCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-700 dark:text-green-300">
                    {t('invite.loggedInAs', { email: currentUserEmail })}
                  </span>
                </div>
                <Button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="w-full"
                >
                  {isAccepting ? t('invite.accepting') : t('invite.acceptInvitation')}
                </Button>
              </div>
            ) : (
              // Email doesn't match - show warning
              <div className="space-y-4">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        {t('invite.emailMismatch')}
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        {t('invite.emailMismatchDetail', {
                          currentEmail: currentUserEmail,
                          inviteEmail: invite?.email,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="secondary"
                  className="w-full"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
                  {t('invite.switchAccount')}
                </Button>
              </div>
            )
          ) : (
            // User not logged in - show login/signup options
            <div className="space-y-4">
              <p className="text-center text-gray-600 dark:text-gray-400">
                {t('invite.loginToAccept')}
              </p>
              <div className="space-y-3">
                <Button onClick={handleLogin} className="w-full">
                  <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
                  {t('invite.loginWithEmail', { email: invite?.email })}
                </Button>
                <Button
                  onClick={handleSignup}
                  variant="secondary"
                  className="w-full"
                >
                  <UserPlusIcon className="h-5 w-5 mr-2" />
                  {t('invite.createAccount')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            {t('invite.poweredBy', { brand: BRAND.NAME })}
          </p>
        </div>
      </div>
    </div>
  );
}

export default AcceptInviteScreen;
