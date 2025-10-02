import React, { ReactNode } from 'react';
import { usePOS } from '../context/POSContext';
import { Navigation } from './Navigation';
import { TopBar } from './TopBar';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export function Layout({ children, title }: LayoutProps) {
  const { state } = usePOS();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <Navigation />
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        <TopBar title={title} />
        <main className="flex-1 pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden">
        <Navigation />
      </div>
    </div>
  );
}