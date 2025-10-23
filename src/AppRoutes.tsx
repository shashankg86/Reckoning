import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoutes } from './routes/ProtectedRoutes';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoutes />}>
        <Route path="/get-started" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* add other protected routes here */}
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
