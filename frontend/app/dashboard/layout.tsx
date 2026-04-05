'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';
import { usePermissions } from '@/lib/hooks/usePermissions';
import Link from 'next/link';
import Image from 'next/image';
import HealthStatusBanner from '@/components/HealthStatusBanner';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isInitialized, user, currentWorkspace, logout, initialize } = useAuthStore();
  const { role } = usePermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Initialize auth on mount if not already initialized
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  useEffect(() => {
    // Redirect to login if not authenticated after initialization
    if (isInitialized && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isInitialized, router]);

  // Show loading while initializing
  if (!isInitialized) {
    return <LoadingScreen />;
  }

  // Don't render dashboard if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-slate-200"
      >
        <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {mobileMenuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-40
        w-64 bg-white shadow-sm border-r border-slate-200 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 sm:p-6 border-b border-slate-200">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <Image 
              src="/branding/logo/logo-animated-icon-loop.svg" 
              alt="ConvoSell" 
              width={40}
              height={40}
              className="w-10 h-10"
            />
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center font-semibold text-[15px] sm:text-base leading-none max-w-[130px] whitespace-nowrap">
  <span className="text-slate-900">Convo</span>
  <span className="text-success-600">Sell</span>
</h1>
              <p className="text-xs text-slate-500 truncate">{currentWorkspace?.name || 'Workspace'}</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto">
          <NavLink href="/dashboard" icon="home" onClick={() => setMobileMenuOpen(false)}>
            Dashboard
          </NavLink>
          <NavLink href="/dashboard/inbox" icon="chat" onClick={() => setMobileMenuOpen(false)}>
            Inbox
          </NavLink>
          <NavLink href="/dashboard/orders" icon="package" onClick={() => setMobileMenuOpen(false)}>
            Orders
          </NavLink>
          <NavLink href="/dashboard/contacts" icon="users" onClick={() => setMobileMenuOpen(false)}>
            Contacts
          </NavLink>
          <NavLink href="/dashboard/automations" icon="zap" onClick={() => setMobileMenuOpen(false)}>
            Automations
          </NavLink>
          <NavLink href="/dashboard/templates" icon="template" onClick={() => setMobileMenuOpen(false)}>
            Templates
          </NavLink>
          <NavLink href="/dashboard/settings" icon="settings" onClick={() => setMobileMenuOpen(false)}>
            Settings
          </NavLink>
        </nav>

        <div className="p-3 sm:p-4 border-t border-slate-200">
          <div className="flex items-center justify-between p-2 sm:p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium flex-shrink-0">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-900 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase flex-shrink-0 ${
                    role === 'owner' ? 'bg-purple-100 text-purple-800' :
                    role === 'admin' ? 'bg-blue-100 text-blue-800' :
                    role === 'manager' ? 'bg-green-100 text-green-800' :
                    role === 'agent' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {role}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full mt-2 px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto lg:ml-0">
        <HealthStatusBanner />
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}

function NavLink({ 
  href, 
  icon, 
  children,
  onClick
}: { 
  href: string; 
  icon: string; 
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const iconMap: Record<string, JSX.Element> = {
    home: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    chat: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    package: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    users: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    zap: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    template: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    settings: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  };

  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center space-x-3 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-slate-700 hover:bg-primary-50 hover:text-primary-700 rounded-lg transition-all duration-150 group"
    >
      <span className="text-slate-400 group-hover:text-primary-600 transition-colors flex-shrink-0">
        {iconMap[icon]}
      </span>
      <span className="font-medium">{children}</span>
    </Link>
  );
}
