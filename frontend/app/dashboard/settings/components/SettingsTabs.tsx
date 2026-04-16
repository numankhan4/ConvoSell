interface SettingsTabsProps {
  activeTab: 'whatsapp' | 'shopify' | 'verification' | 'cart-recovery';
  onChange: (tab: 'whatsapp' | 'shopify' | 'verification' | 'cart-recovery') => void;
}

export function SettingsTabs({ activeTab, onChange }: SettingsTabsProps) {
  return (
    <nav className="flex border-b border-slate-200">
      <button
        onClick={() => onChange('whatsapp')}
        className={`flex-1 py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-medium transition-colors relative ${
          activeTab === 'whatsapp'
            ? 'text-primary-600 bg-primary-50'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center justify-center space-x-1 sm:space-x-2">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          <span>WhatsApp Business</span>
        </div>
        {activeTab === 'whatsapp' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"></div>}
      </button>

      <button
        onClick={() => onChange('shopify')}
        className={`flex-1 py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-medium transition-colors relative ${
          activeTab === 'shopify'
            ? 'text-primary-600 bg-primary-50'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center justify-center space-x-1 sm:space-x-2">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
          <span>Shopify Store</span>
        </div>
        {activeTab === 'shopify' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"></div>}
      </button>

      <button
        onClick={() => onChange('verification')}
        className={`flex-1 py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-medium transition-colors relative ${
          activeTab === 'verification'
            ? 'text-primary-600 bg-primary-50'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center justify-center space-x-1 sm:space-x-2">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Order Verification</span>
        </div>
        {activeTab === 'verification' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"></div>}
      </button>

      <button
        onClick={() => onChange('cart-recovery')}
        className={`flex-1 py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-medium transition-colors relative ${
          activeTab === 'cart-recovery'
            ? 'text-primary-600 bg-primary-50'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center justify-center space-x-1 sm:space-x-2">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2m0 0L7 13h10l2-8H5.4zM7 13l-1 5h12M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
          </svg>
          <span>Cart Recovery</span>
        </div>
        {activeTab === 'cart-recovery' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"></div>}
      </button>
    </nav>
  );
}
