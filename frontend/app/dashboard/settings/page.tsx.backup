'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth';
import { settingsApi } from '@/lib/api/settings';
import toast from 'react-hot-toast';

interface WhatsAppIntegration {
  id: string;
  phoneNumberId: string;
  phoneNumber: string;
  businessAccountId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ShopifyStore {
  id: string;
  shopDomain: string;
  clientId: string;
  scopes: string;
  isActive: boolean;
  installedAt: string;
  lastSyncAt: string | null;
  tokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'shopify'>('whatsapp');

  // WhatsApp state
  const [whatsappIntegration, setWhatsappIntegration] = useState<WhatsAppIntegration | null>(null);
  const [whatsappForm, setWhatsappForm] = useState({
    phoneNumberId: '',
    phoneNumber: '',
    businessAccountId: '',
    accessToken: '',
  });
  const [isWhatsappLoading, setIsWhatsappLoading] = useState(false);
  const [showTokenHelp, setShowTokenHelp] = useState(false);
  const [showCredentialsHelp, setShowCredentialsHelp] = useState(false);

  // Shopify state
  const [shopifyStore, setShopifyStore] = useState<ShopifyStore | null>(null);
  const [shopifyForm, setShopifyForm] = useState({
    shopDomain: '',
    clientId: '',
    clientSecret: '',
    scopes: 'read_orders,write_orders,read_customers,write_customers',
  });
  const [isShopifyLoading, setIsShopifyLoading] = useState(false);

  // Load WhatsApp integration on mount
  useEffect(() => {
    loadWhatsAppIntegration();
    loadShopifyStore();
  }, []);

  // Populate WhatsApp form when integration is loaded
  useEffect(() => {
    if (whatsappIntegration) {
      setWhatsappForm({
        phoneNumberId: whatsappIntegration.phoneNumberId,
        phoneNumber: whatsappIntegration.phoneNumber,
        businessAccountId: whatsappIntegration.businessAccountId,
        accessToken: '', // Don't show existing token for security
      });
    }
  }, [whatsappIntegration]);

  // Populate Shopify form when store is loaded
  useEffect(() => {
    if (shopifyStore) {
      setShopifyForm({
        shopDomain: shopifyStore.shopDomain,
        clientId: shopifyStore.clientId,
        clientSecret: '', // Don't show existing secret for security
        scopes: shopifyStore.scopes,
      });
    }
  }, [shopifyStore]);

  const loadWhatsAppIntegration = async () => {
    if (!token) return;
    try {
      const data = await settingsApi.getWhatsAppIntegration(token);
      if (data) {
        setWhatsappIntegration(data);
      }
    } catch (error: any) {
      console.error('Failed to load WhatsApp integration:', error);
    }
  };

  const loadShopifyStore = async () => {
    if (!token) return;
    try {
      const data = await settingsApi.getShopifyStore(token);
      if (data) {
        setShopifyStore(data);
      }
    } catch (error: any) {
      console.error('Failed to load Shopify store:', error);
    }
  };

  const handleWhatsAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsWhatsappLoading(true);

    try {
      if (whatsappIntegration) {
        // Update existing
        const updated = await settingsApi.updateWhatsAppIntegration(
          token,
          whatsappIntegration.id,
          whatsappForm,
        );
        setWhatsappIntegration(updated);
        toast.success('WhatsApp integration updated successfully! ✓');
      } else {
        // Create new
        const created = await settingsApi.createWhatsAppIntegration(token, whatsappForm);
        setWhatsappIntegration(created);
        toast.success('WhatsApp integration created successfully! 🎉');
        
        // Reset form only after creation
        setWhatsappForm({
          phoneNumberId: '',
          phoneNumber: '',
          businessAccountId: '',
          accessToken: '',
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save WhatsApp integration');
    } finally {
      setIsWhatsappLoading(false);
    }
  };

  const handleShopifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsShopifyLoading(true);

    try {
      if (shopifyStore) {
        // Update existing
        const updated = await settingsApi.updateShopifyStore(token, shopifyStore.id, shopifyForm);
        setShopifyStore(updated);
        toast.success('Shopify store updated successfully! ✓');
      } else {
        // Create new
        const created = await settingsApi.createShopifyStore(token, shopifyForm);
        setShopifyStore(created);
        toast.success('Shopify store connected successfully! 🎉');
        
        // Reset form only after creation
        setShopifyForm({
          shopDomain: '',
          clientId: '',
          clientSecret: '',
          scopes: 'read_orders,write_orders,read_customers,write_customers',
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save Shopify store');
    } finally {
      setIsShopifyLoading(false);
    }
  };

  const handleDeleteWhatsApp = async () => {
    if (!token || !whatsappIntegration) return;
    
    toast((t) => (
      <div className="space-y-3">
        <div>
          <div className="font-semibold text-slate-900">Disconnect WhatsApp?</div>
          <div className="text-sm text-slate-600 mt-1">This will stop all WhatsApp messaging.</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await settingsApi.deleteWhatsAppIntegration(token, whatsappIntegration.id);
                setWhatsappIntegration(null);
                toast.success('WhatsApp integration deleted successfully!');
              } catch (error: any) {
                toast.error(error.response?.data?.message || 'Failed to delete integration');
              }
            }}
            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const handleDeleteShopify = async () => {
    if (!token || !shopifyStore) return;
    
    toast((t) => (
      <div className="space-y-3">
        <div>
          <div className="font-semibold text-slate-900">Disconnect Shopify?</div>
          <div className="text-sm text-slate-600 mt-1">This will stop order syncing.</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await settingsApi.deleteShopifyStore(token, shopifyStore.id);
                setShopifyStore(null);
                toast.success('Shopify store deleted successfully!');
              } catch (error: any) {
                toast.error(error.response?.data?.message || 'Failed to delete store');
              }
            }}
            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const handleRegisterWebhooks = async () => {
    if (!token) return;

    try {
      const results = await settingsApi.registerShopifyWebhooks(token);
      const successCount = results.filter((r: any) => r.success).length;
      const failCount = results.filter((r: any) => !r.success).length;
      
      if (failCount === 0) {
        toast.success(`✅ ${successCount} webhooks registered successfully!`);
      } else {
        toast.error(`⚠️ ${successCount} succeeded, ${failCount} failed. Check console for details.`);
      }
      console.log('Webhook registration results:', results);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to register webhooks');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm sm:text-base text-slate-600 mt-2">Manage your integrations and configurations</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <nav className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-medium transition-colors relative ${
              activeTab === 'whatsapp'
                ? 'text-primary-600 bg-primary-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-1 sm:space-x-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              <span>WhatsApp Business</span>
            </div>
            {activeTab === 'whatsapp' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('shopify')}
            className={`flex-1 py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-medium transition-colors relative ${
              activeTab === 'shopify'
                ? 'text-primary-600 bg-primary-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-1 sm:space-x-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.337 2.487c-.043-.153-.119-.232-.255-.232h-2.571c-.187 0-.306.077-.357.255l-.476 1.632h3.735l-.076-.272zM12.678 5.142H9.965l1.989 5.954 1.734-5.954z"/>
              </svg>
              <span>Shopify Store</span>
            </div>
            {activeTab === 'shopify' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"></div>
            )}
          </button>
        </nav>

        {/* WhatsApp Integration Tab */}
        {activeTab === 'whatsapp' && (
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-primary-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                WhatsApp Business API
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Connect your Meta WhatsApp Cloud API to send and receive messages
              </p>
            </div>

          {/* Current Integration Status */}
          {whatsappIntegration && (
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 border-2 border-primary-200 rounded-xl p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-primary-900 text-lg">Connected</h3>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-primary-800">
                      <span className="font-medium">Phone:</span> <span className="font-mono bg-white px-2 py-0.5 rounded">{whatsappIntegration.phoneNumber}</span>
                    </p>
                    <p className="text-sm text-primary-800">
                      <span className="font-medium">Phone ID:</span> <span className="font-mono bg-white px-2 py-0.5 rounded text-xs">{whatsappIntegration.phoneNumberId}</span>
                    </p>
                    <p className="text-sm text-primary-800">
                      <span className="font-medium">Status:</span>
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                        whatsappIntegration.isActive
                          ? 'bg-primary-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}>
                        {whatsappIntegration.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDeleteWhatsApp}
                  className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors border border-red-200"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}

          {/* Configuration Form */}
          <form onSubmit={handleWhatsAppSubmit} className="space-y-5">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Phone Number ID *
              </label>
              <input
                type="text"
                value={whatsappForm.phoneNumberId}
                onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneNumberId: e.target.value })}
                placeholder="123456789012345"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Found in: Use cases (pencil icon) → Customize → API Setup panel
              </p>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="text"
                value={whatsappForm.phoneNumber}
                onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneNumber: e.target.value })}
                placeholder="+923001234567"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-1">E.164 format (e.g., +92 for Pakistan)</p>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Business Account ID *
              </label>
              <input
                type="text"
                value={whatsappForm.businessAccountId}
                onChange={(e) => setWhatsappForm({ ...whatsappForm, businessAccountId: e.target.value })}
                placeholder="123456789012345"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                <span>Access Token *</span>
                <button
                  type="button"
                  onClick={() => setShowTokenHelp(!showTokenHelp)}
                  className="text-primary-600 hover:text-primary-700 text-xs font-normal flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  How to generate?
                </button>
              </label>
              <input
                type="password"
                value={whatsappForm.accessToken}
                onChange={(e) => setWhatsappForm({ ...whatsappForm, accessToken: e.target.value })}
                placeholder="EAAG..."
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                required
              />
              
              {/* Expandable Help Section */}
              {showTokenHelp && (
                <div className="mt-3 bg-gradient-to-br from-primary-50 to-blue-50 border border-primary-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-2 mb-3">
                    <svg className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-primary-900 text-sm">How to Generate WhatsApp Access Token</h4>
                      <p className="text-xs text-primary-700 mt-1">Follow these steps to get your access token from Meta Business Manager:</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Option 1: System User Token (Recommended) */}
                    <div className="bg-white rounded-lg p-3 border border-primary-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded">RECOMMENDED</span>
                        <h5 className="font-semibold text-sm text-gray-900">Option 1: System User Token (Never Expires)</h5>
                      </div>
                      <ol className="text-xs text-gray-700 space-y-2 list-decimal list-inside ml-1">
                        <li>
                          Go to <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline font-medium">Meta Business Settings → System Users</a>
                        </li>
                        <li>Click <strong>"Add"</strong> button to create a new System User (or select existing one)</li>
                        <li>Give it a name like <code className="bg-gray-100 px-1 rounded">"WhatsApp CRM Integration"</code></li>
                        <li>Click on the System User name, then click <strong>"Generate New Token"</strong></li>
                        <li>Select your <strong>WhatsApp App</strong> from the dropdown</li>
                        <li>
                          Check these permissions:
                          <ul className="ml-6 mt-1 space-y-0.5 list-disc">
                            <li><code className="bg-gray-100 px-1">whatsapp_business_messaging</code></li>
                            <li><code className="bg-gray-100 px-1">whatsapp_business_management</code></li>
                            <li><code className="bg-gray-100 px-1">business_management</code></li>
                          </ul>
                        </li>
                        <li>
                          <strong className="text-green-700">Token Expiration: Select "Never"</strong> ✨
                        </li>
                        <li>Click <strong>"Generate Token"</strong> and copy it immediately</li>
                        <li>Paste the token in the field above and select <strong>Token Type: "System User"</strong></li>
                      </ol>
                      <div className="mt-2 bg-green-50 border border-green-200 rounded p-2">
                        <p className="text-xs text-green-800">
                          <strong>✅ Best for Production:</strong> These tokens never expire and require zero maintenance!
                        </p>
                      </div>
                    </div>

                    {/* Option 2: Temporary Token */}
                    <div className="bg-white rounded-lg p-3 border border-amber-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded">TESTING ONLY</span>
                        <h5 className="font-semibold text-sm text-gray-900">Option 2: Temporary Token (24 Hours)</h5>
                      </div>
                      <ol className="text-xs text-gray-700 space-y-2 list-decimal list-inside ml-1">
                        <li>
                          Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline font-medium">Meta App Dashboard</a>
                        </li>
                        <li>Select your WhatsApp Business App</li>
                        <li>In left sidebar, click <strong>"WhatsApp" → "API Setup"</strong></li>
                        <li>You'll see a <strong>"Temporary access token"</strong> displayed</li>
                        <li>Click <strong>"Copy"</strong> to copy the token</li>
                        <li>Paste it in the field above</li>
                      </ol>
                      <div className="mt-2 bg-amber-50 border border-amber-200 rounded p-2">
                        <p className="text-xs text-amber-800">
                          <strong>⚠️ Warning:</strong> Temporary tokens expire in 24 hours. Only use for testing!
                        </p>
                      </div>
                    </div>

                    {/* Quick Links */}
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <h5 className="font-semibold text-sm text-gray-900 mb-2">📌 Quick Links</h5>
                      <div className="space-y-1 text-xs">
                        <a 
                          href="https://business.facebook.com/settings/system-users" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block text-primary-600 hover:underline"
                        >
                          → Meta Business Settings (System Users)
                        </a>
                        <a 
                          href="https://developers.facebook.com/apps" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block text-primary-600 hover:underline"
                        >
                          → Meta App Dashboard
                        </a>
                        <a 
                          href="https://developers.facebook.com/docs/whatsapp/business-management-api/get-started" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block text-primary-600 hover:underline"
                        >
                          → Official Meta Documentation
                        </a>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowTokenHelp(false)}
                    className="mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    ✕ Close help
                  </button>
                </div>
              )}
              
              {!showTokenHelp && (
                <p className="text-xs text-gray-500 mt-1">
                  💡 Click "How to generate?" above for step-by-step instructions
                </p>
              )}
            </div>

            {/* Webhook Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">Webhook Configuration</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Webhook verify token is configured in your <code className="bg-blue-100 px-1 py-0.5 rounded text-xs">.env</code> file as <code className="bg-blue-100 px-1 py-0.5 rounded text-xs">WHATSAPP_WEBHOOK_VERIFY_TOKEN</code>.
                    This is a system-wide setting managed by your administrator.
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    <strong>Webhook URL:</strong> <code className="bg-white px-2 py-1 rounded text-xs border border-blue-200">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/whatsapp/webhook</code>
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isWhatsappLoading}
                className="w-full h-14 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white px-6 rounded-xl font-semibold transition-all disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow-md"
              >
                {isWhatsappLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : whatsappIntegration ? (
                  'Update WhatsApp Configuration'
                ) : (
                  'Connect WhatsApp Business'
                )}
              </button>
            </div>
          </form>

          {/* Complete Setup Guide */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-blue-900 text-base flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                📘 Complete WhatsApp Setup Guide (2026)
              </h3>
              <button
                type="button"
                onClick={() => setShowCredentialsHelp(!showCredentialsHelp)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-sm hover:shadow-md"
              >
                {showCredentialsHelp ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Hide Guide
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Show Step-by-Step Guide
                  </>
                )}
              </button>
            </div>
            
            {!showCredentialsHelp && (
              <p className="text-sm text-blue-700">
                💡 New to WhatsApp Cloud API? Click <strong>"Show Step-by-Step Guide"</strong> for complete setup instructions
              </p>
            )}
            
            {showCredentialsHelp && (
              <div className="space-y-4 mt-4">
                {/* Step 1: Create WhatsApp App */}
                <div className="bg-white rounded-lg p-4 border-2 border-purple-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                    <h4 className="font-bold text-purple-900 text-sm">Create WhatsApp Business App</h4>
                  </div>
                  <ol className="text-xs text-gray-700 space-y-2 list-decimal list-inside ml-1">
                    <li>
                      Navigate to <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline font-semibold">Meta for Developers</a>
                    </li>
                    <li>Click <strong>"Create App"</strong> button in the top right</li>
                    <li>Select <strong>"Business"</strong> as the app type</li>
                    <li>Choose <strong>"Connect with customers through WhatsApp"</strong> use case</li>
                    <li>Fill in app details:
                      <ul className="ml-6 mt-1 space-y-0.5 list-disc">
                        <li>App Name: <code className="bg-gray-100 px-1">"Your Business CRM"</code></li>
                        <li>App Contact Email: Your business email</li>
                        <li>Business Account: Select or create one</li>
                      </ul>
                    </li>
                    <li>Click <strong>"Create App"</strong></li>
                  </ol>
                  <div className="mt-3 bg-purple-50 border border-purple-200 rounded p-2">
                    <p className="text-xs text-purple-800">
                      ✨ <strong>Tip:</strong> Keep this browser tab open - you'll need to come back to it!
                    </p>
                  </div>
                </div>

                {/* Step 2: Get Phone Number ID and Business Account ID */}
                <div className="bg-white rounded-lg p-4 border-2 border-blue-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                    <h4 className="font-bold text-blue-900 text-sm">Get Phone Number ID & Business Account ID</h4>
                  </div>
                  <ol className="text-xs text-gray-700 space-y-2 list-decimal list-inside ml-1">
                    <li>In your WhatsApp App dashboard, look for the left sidebar</li>
                    <li>Click <strong>"Use cases"</strong> (pencil/edit icon)</li>
                    <li>Click <strong>"Customize"</strong> button</li>
                    <li>Find the <strong>"API Setup"</strong> panel on the right side</li>
                    <li>
                      You'll see two important IDs:
                      <ul className="ml-6 mt-1 space-y-0.5 list-disc">
                        <li><strong>Phone number ID:</strong> <code className="bg-blue-100 px-1">1110254672164163</code> (example)</li>
                        <li><strong>WhatsApp Business Account ID:</strong> <code className="bg-blue-100 px-1">123456789012345</code> (example)</li>
                      </ul>
                    </li>
                    <li>Copy both IDs and paste them in the form fields above ☝️</li>
                  </ol>
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-2">
                    <p className="text-xs text-blue-800">
                      📌 <strong>Note:</strong> The test phone number provided is for development only. For production, you'll need to add your own verified number.
                    </p>
                  </div>
                </div>

                {/* Step 3: Generate Access Token (reference) */}
                <div className="bg-white rounded-lg p-4 border-2 border-green-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                    <h4 className="font-bold text-green-900 text-sm">Generate Access Token</h4>
                  </div>
                  <div className="text-xs text-gray-700">
                    <p className="mb-2">For detailed token generation instructions, see the <strong>"Access Token"</strong> field above and click <strong>"How to generate?"</strong></p>
                    <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
                      <p className="text-green-800 font-medium">✅ Recommended: Use System User Token (never expires)</p>
                    </div>
                  </div>
                </div>

                {/* Step 4: Configure Webhook */}
                <div className="bg-white rounded-lg p-4 border-2 border-amber-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm">4</div>
                    <h4 className="font-bold text-amber-900 text-sm">Configure Webhook in Meta</h4>
                  </div>
                  <ol className="text-xs text-gray-700 space-y-2 list-decimal list-inside ml-1">
                    <li>In your WhatsApp App, go to <strong>WhatsApp → Configuration</strong> in the left sidebar</li>
                    <li>Scroll to <strong>"Webhook"</strong> section</li>
                    <li>Click <strong>"Edit"</strong> button</li>
                    <li>
                      Enter your webhook details:
                      <ul className="ml-6 mt-1 space-y-1 list-disc">
                        <li><strong>Callback URL:</strong> <code className="bg-gray-100 px-1 text-xs">https://your-domain.com/api/webhooks/whatsapp</code></li>
                        <li><strong>Verify Token:</strong> Must match <code className="bg-gray-100 px-1">WHATSAPP_WEBHOOK_VERIFY_TOKEN</code> in your .env file</li>
                      </ul>
                    </li>
                    <li>Click <strong>"Verify and Save"</strong></li>
                    <li>
                      Subscribe to webhook fields:
                      <ul className="ml-6 mt-1 space-y-0.5 list-disc">
                        <li><code className="bg-gray-100 px-1">messages</code> ✅</li>
                        <li><code className="bg-gray-100 px-1">message_status</code> ✅</li>
                      </ul>
                    </li>
                  </ol>
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded p-2">
                    <p className="text-xs text-amber-800">
                      🔐 <strong>Security:</strong> The verify token is set by your system administrator in the backend .env file. Contact them if you need this value.
                    </p>
                  </div>
                </div>

                {/* Step 5: Test Connection */}
                <div className="bg-white rounded-lg p-4 border-2 border-emerald-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-sm">5</div>
                    <h4 className="font-bold text-emerald-900 text-sm">Test Your Setup</h4>
                  </div>
                  <ol className="text-xs text-gray-700 space-y-2 list-decimal list-inside ml-1">
                    <li>Complete the form above with all your credentials</li>
                    <li>Click <strong>"Connect WhatsApp Business"</strong> or <strong>"Update Configuration"</strong></li>
                    <li>If successful, you'll see a green success message ✅</li>
                    <li>Send a test message to your WhatsApp number</li>
                    <li>Check the <strong>Inbox</strong> page - your message should appear there!</li>
                  </ol>
                  <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded p-2">
                    <p className="text-xs text-emerald-800">
                      🎉 <strong>Success!</strong> You're now ready to manage WhatsApp conversations from your CRM!
                    </p>
                  </div>
                </div>

                {/* Additional Resources */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
                  <h4 className="font-semibold text-indigo-900 text-sm mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Additional Resources
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <a 
                      href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block text-indigo-600 hover:underline font-medium"
                    >
                      → Official WhatsApp Cloud API Documentation
                    </a>
                    <a 
                      href="https://business.facebook.com/latest/settings" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block text-indigo-600 hover:underline font-medium"
                    >
                      → Meta Business Settings
                    </a>
                    <a 
                      href="https://developers.facebook.com/apps" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block text-indigo-600 hover:underline font-medium"
                    >
                      → Meta for Developers Dashboard
                    </a>
                    <div className="pt-2 mt-2 border-t border-indigo-200">
                      <p className="text-indigo-700">
                        📖 For complete setup with screenshots, see <strong>CONFIGURATION.md</strong> in the project root directory
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCredentialsHelp(false)}
                  className="w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md"
                >
                  ✕ Close Guide
                </button>
              </div>
            )}
          </div>

          {/* Webhook Configuration Card */}
          <div className="mt-6 bg-amber-50 border border-amber-300 rounded-lg p-4">
            <h3 className="font-semibold text-amber-900 mb-2">🔗 Webhook Configuration (Meta Dashboard)</h3>
            <p className="text-sm text-amber-800 mb-3">
              When Meta asks for webhook details, enter:
            </p>
            <div className="space-y-2 text-sm">
              <div className="bg-white rounded p-3 border border-amber-200">
                <div className="font-semibold text-amber-900 mb-1">Callback URL:</div>
                <div className="font-mono text-xs text-amber-800 break-all">
                  Production: https://your-domain.com/api/webhooks/whatsapp
                </div>
                <div className="font-mono text-xs text-amber-800 break-all mt-1">
                  Local Testing: https://YOUR-NGROK-ID.ngrok.io/api/webhooks/whatsapp
                </div>
                <div className="text-xs text-amber-700 mt-1">
                  ℹ️ For local dev, run: <code className="bg-amber-100 px-1">ngrok http 3000</code>
                </div>
              </div>
              <div className="bg-white rounded p-3 border border-amber-200">
                <div className="font-semibold text-amber-900 mb-1">Verify Token:</div>
                <div className="text-xs text-amber-800">
                  <strong>Configured in server .env file:</strong> <code className="bg-amber-100 px-1.5 py-0.5 rounded">WHATSAPP_WEBHOOK_VERIFY_TOKEN</code>
                </div>
                <div className="text-xs text-amber-700 mt-2">
                  ℹ️ This is a system-wide setting. Contact your administrator if you need to know or change this value.
                </div>
                <div className="text-xs text-red-600 mt-2 font-medium">
                  ⚠️ Must match exactly in Meta dashboard webhook configuration
                </div>
              </div>
            </div>
            <p className="text-xs text-amber-700 mt-3 font-medium">
              📌 Note: Unpublished apps only receive test webhooks. For production, submit app for Meta review.
            </p>
          </div>
        </div>
      )}

        {/* Shopify Integration Tab */}
        {activeTab === 'shopify' && (
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.337 2.487c-.043-.153-.119-.232-.255-.232h-2.571c-.187 0-.306.077-.357.255l-.476 1.632h3.735l-.076-.272zM12.678 5.142H9.965l1.989 5.954 1.734-5.954z"/>
              </svg>
              Shopify Store
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Connect your Shopify store to sync orders and customer data
            </p>
          </div>

          {/* Current Store Status */}
          {shopifyStore && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-green-900">✓ Connected</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Store: <span className="font-mono">{shopifyStore.shopDomain}</span>
                  </p>
                  <p className="text-sm text-green-700">
                    Scopes: <span className="font-mono text-xs">{shopifyStore.scopes}</span>
                  </p>
                  <p className="text-sm text-green-700">
                    Status: <span className={shopifyStore.isActive ? 'text-green-600' : 'text-red-600'}>
                      {shopifyStore.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                  {shopifyStore.lastSyncAt && (
                    <p className="text-xs text-green-600 mt-1">
                      Last synced: {new Date(shopifyStore.lastSyncAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleDeleteShopify}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}

          {/* Configuration Form */}
          <form onSubmit={handleShopifySubmit} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Shop Domain *
              </label>
              <input
                type="text"
                value={shopifyForm.shopDomain}
                onChange={(e) => setShopifyForm({ ...shopifyForm, shopDomain: e.target.value })}
                placeholder="mystore.myshopify.com"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Your Shopify store domain</p>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Client ID *
              </label>
              <input
                type="text"
                value={shopifyForm.clientId}
                onChange={(e) => setShopifyForm({ ...shopifyForm, clientId: e.target.value })}
                placeholder="d6eaddca527e17659ddf599d6096e11f"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-mono"
                required
              />
              <p className="text-xs text-gray-500 mt-1">From Partners Dashboard → Apps → Your App → Configuration</p>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Client Secret / App Secret Key *
              </label>
              <input
                type="password"
                value={shopifyForm.clientSecret}
                onChange={(e) => setShopifyForm({ ...shopifyForm, clientSecret: e.target.value })}
                placeholder="shpss_..."
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-mono"
                required
              />
              <p className="text-xs text-gray-500 mt-1">From Partners Dashboard → Apps → Your App → Configuration → App credentials</p>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">API Scopes</label>
              <input
                type="text"
                value={shopifyForm.scopes}
                onChange={(e) => setShopifyForm({ ...shopifyForm, scopes: e.target.value })}
                placeholder="read_orders,write_orders,read_customers"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated list of required scopes</p>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isShopifyLoading}
                className="w-full min-h-[44px] bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white px-6 py-2.5 sm:py-3 rounded-xl font-semibold transition-all disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow-md text-sm sm:text-base"
              >
                {isShopifyLoading
                  ? 'Saving...'
                  : shopifyStore
                  ? 'Update Shopify Configuration'
                  : 'Connect Shopify Store'}
              </button>
            </div>
          </form>

          {/* Webhook Registration (only show if store is connected) */}
          {shopifyStore && (
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 mb-1">🔗 Webhook Configuration</h3>
                  <p className="text-sm text-green-700">
                    Webhooks are auto-registered on connect. Click below to re-register if you changed your webhook URL.
                  </p>
                </div>
                <button
                  onClick={handleRegisterWebhooks}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                >
                  Register Webhooks
                </button>
              </div>
            </div>
          )}

          {/* Setup Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📘 How to connect your Shopify store (2026 Method):</h3>
            <ol className="text-sm text-blue-800 space-y-1.5 list-decimal list-inside">
              <li>Go to <strong>Shopify Partners Dashboard</strong> (partners.shopify.com)</li>
              <li>Click <strong>Apps</strong> → Select your app (e.g., "ConvoSell CRM")</li>
              <li>Go to <strong>Configuration</strong> tab</li>
              <li>Copy the <strong>Client ID</strong> from the top</li>
              <li>Under <strong>App credentials</strong>, find <strong>Client secret / App secret key</strong> (starts with shpss_)</li>
              <li>Enter your <strong>Store Domain</strong> (e.g., convosell.myshopify.com)</li>
              <li>Paste credentials above and click Connect</li>
              <li className="font-semibold">✨ Webhooks auto-register on connect!</li>
              <li className="font-semibold">🔄 Access tokens auto-refresh every 24 hours!</li>
            </ol>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> Make sure your backend URL is set in environment variables (<code className="bg-blue-100 px-1 rounded">SHOPIFY_WEBHOOK_URL</code>) 
                or webhooks will use localhost.
              </p>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
