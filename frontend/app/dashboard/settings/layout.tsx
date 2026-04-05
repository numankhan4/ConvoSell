'use client';

import SettingsNav from '@/components/SettingsNav';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Settings Navigation Sidebar */}
      <div className="lg:col-span-1">
        <SettingsNav />
      </div>

      {/* Main Settings Content */}
      <div className="lg:col-span-3">
        {children}
      </div>
    </div>
  );
}
