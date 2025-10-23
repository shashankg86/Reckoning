import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Route guard that ensures:
 * - Unauthenticated → redirect to /login
 * - Authenticated + store set up → redirect to /dashboard
 * - Authenticated + no store → stay on /get-started
 */
export function ProtectedRoutes() {
  const { state } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!state.isAuthenticated) return; // handled below

    // If user already onboarded, prevent ever seeing onboarding paths
    if (state.isOnboarded && (location.pathname === '/get-started' || location.pathname === '/onboarding')) {
      navigate('/dashboard', { replace: true });
    }
  }, [state.isAuthenticated, state.isOnboarded, location.pathname, navigate]);

  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Allow access to dashboard and app when onboarded
  if (state.isOnboarded) {
    return <Outlet />;
  }

  // If not onboarded, force onboarding
  if (location.pathname !== '/get-started' && location.pathname !== '/onboarding') {
    return <Navigate to="/get-started" replace />;
  }

  return <Outlet />;
}
