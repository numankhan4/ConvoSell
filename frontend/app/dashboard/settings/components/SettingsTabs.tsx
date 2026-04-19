import type { ReactNode } from 'react';

interface SettingsTabsProps {
  activeTab: 'whatsapp' | 'shopify' | 'verification' | 'cart-recovery';
  onChange: (tab: 'whatsapp' | 'shopify' | 'verification' | 'cart-recovery') => void;
}

export function SettingsTabs({ activeTab, onChange }: SettingsTabsProps) {
  const tabs: Array<{
    key: 'whatsapp' | 'shopify' | 'verification' | 'cart-recovery';
    label: string;
    icon: ReactNode;
  }> = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: (
        <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11a1 1 0 011-1h6a1 1 0 011 1v5a1 1 0 01-1 1h-2l-3 3v-3H9a1 1 0 01-1-1v-5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10" />
        </svg>
      ),
    },
    {
      key: 'shopify',
      label: 'Shopify',
      icon: (
        <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l1.5 8h11l2-6H7" />
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="17" cy="19" r="1.5" />
        </svg>
      ),
    },
    {
      key: 'verification',
      label: 'Verification',
      icon: (
        <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
        </svg>
      ),
    },
    {
      key: 'cart-recovery',
      label: 'Cart Recovery',
      icon: (
        <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h2l1.2 6h11.8l1.5-5H7" />
          <circle cx="10" cy="19" r="1.5" />
          <circle cx="17" cy="19" r="1.5" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-200 bg-slate-50/50" role="tablist" aria-label="Settings sections">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`relative flex items-center justify-center gap-2 px-3 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary-50 text-primary-700'
                : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {isActive && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary-600" />}
          </button>
        );
      })}
    </nav>
  );
}
