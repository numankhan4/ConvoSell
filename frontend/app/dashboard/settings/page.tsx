'use client';

import { useState } from 'react';
import { IntegrationOverviewCards } from './components/IntegrationOverviewCards';
import { SettingsHeader } from './components/SettingsHeader';
import { SettingsTabs } from './components/SettingsTabs';
import { ShopifySettingsTab } from './components/ShopifySettingsTab';
import { WhatsAppSettingsTab } from './components/WhatsAppSettingsTab';
import { OrderVerificationSettingsTab } from './components/OrderVerificationSettingsTab';
import { CartRecoverySettingsTab } from './components/CartRecoverySettingsTab';
import { usePermissions } from '@/lib/hooks/usePermissions';

export default function SettingsPage() {
  const { role } = usePermissions();
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'shopify' | 'verification' | 'cart-recovery'>('whatsapp');
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [shopifyConnected, setShopifyConnected] = useState(false);

  return (
    <div className="space-y-6 sm:space-y-8">
      <SettingsHeader role={role} />

      <IntegrationOverviewCards
        whatsappConnected={whatsappConnected}
        shopifyConnected={shopifyConnected}
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <SettingsTabs activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'whatsapp' && (
          <WhatsAppSettingsTab onConnectionChange={setWhatsappConnected} />
        )}

        {activeTab === 'shopify' && (
          <ShopifySettingsTab onConnectionChange={setShopifyConnected} />
        )}

        {activeTab === 'verification' && (
          <OrderVerificationSettingsTab />
        )}

        {activeTab === 'cart-recovery' && (
          <CartRecoverySettingsTab />
        )}
      </div>
    </div>
  );
}
