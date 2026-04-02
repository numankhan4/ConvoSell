'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/store/auth';
import { settingsApi } from '@/lib/api/settings';
import toast from 'react-hot-toast';
import ConnectionStatusCard from '@/components/settings/ConnectionStatusCard';
import ConnectionTester from '@/components/settings/ConnectionTester';
import InlineFieldValidator, { validators } from '@/components/settings/InlineFieldValidator';

interface WhatsAppIntegration {
  id: string;
  phoneNumberId: string;
  phoneNumber: string;
  businessAccountId: string;
  tokenType?: string;
  tokenExpiresAt?: string;
  healthStatus?: 'healthy' | 'warning' | 'error' | 'unknown';
  healthError?: string;
  lastHealthCheck?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ShopifyStore {
  id: string;
  shopDomain: string;
  clientId: string;
  scopes: string;
  tokenExpiresAt?: string;
  isActive: boolean;
  installedAt: string;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WebhookUrls {
  whatsapp: {
    callbackUrl: string;
    verifyToken: string;
    setupInstructions: string[];
  };
  shopify: {
    callbackUrls: any;
    setupInstructions: string[];
    note: string;
  };
}

export default function SettingsPage() {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'shopify'>('whatsapp');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Shopify state
  const [shopifyStore, setShopifyStore] = useState<ShopifyStore | null>(null);
  const [shopifyForm, setShopifyForm] = useState({
    shopDomain: '',
    clientId: '',
    clientSecret: '',
    scopes: 'read_orders,write_orders,read_customers,write_customers',
  });
  const [isShopifyLoading, setIsShopifyLoading] = useState(false);

  // Webhook URLs state
  const [webhookUrls, setWebhookUrls] = useState<WebhookUrls | null>(null);

  // Load integrations and webhook URLs on mount
  useEffect(() => {
    loadWhatsAppIntegration();
    loadShopifyStore();
    loadWebhookUrls();
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
      setHasUnsavedChanges(false);
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
      setHasUnsavedChanges(false);
    }
  }, [shopifyStore]);

  // Warn on unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeTab === 'whatsapp') {
          handleWhatsAppSubmit(new Event('submit') as any);
        } else {
          handleShopifySubmit(new Event('submit') as any);
        }
      }
      // Esc to close help
      if (e.key === 'Escape') {
        setShowTokenHelp(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, whatsappForm, shopifyForm]);

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

  const loadWebhookUrls = async () => {
    if (!token) return;
    try {
      const data = await settingsApi.getWebhookUrls(token);
      setWebhookUrls(data);
    } catch (error: any) {
      console.error('Failed to load webhook URLs:', error);
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
        toast.success('✓ WhatsApp integration updated successfully!');
      } else {
        // Create new
        const created = await settingsApi.createWhatsAppIntegration(token, whatsappForm);
        setWhatsappIntegration(created);
        toast.success('🎉 WhatsApp integration created successfully!');
      }
      setHasUnsavedChanges(false);
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
        toast.success('✓ Shopify store updated successfully!');
      } else {
        // Create new
        const created = await settingsApi.createShopifyStore(token, shopifyForm);
        setShopifyStore(created);
        toast.success('🎉 Shopify store connected successfully!');
      }
      setHasUnsavedChanges(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save Shopify store');
    } finally {
      setIsShopifyLoading(false);
    }
  };

  const handleDeleteWhatsApp = () => {
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
                setWhatsappForm({
                  phoneNumberId: '',
                  phoneNumber: '',
                  businessAccountId: '',
                  accessToken: '',
                });
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

  const handleDeleteShopify = () => {
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
                setShopifyForm({
                  shopDomain: '',
                  clientId: '',
                  clientSecret: '',
                  scopes: 'read_orders,write_orders,read_customers,write_customers',
                });
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

  const handleTestWhatsApp = async (credentials: any) => {
    if (!token) throw new Error('Not authenticated');
    return await settingsApi.testWhatsAppConnection(token, credentials);
  };

  const handleTestShopify = async (credentials: any) => {
    if (!token) throw new Error('Not authenticated');
    return await settingsApi.testShopifyConnection(token, credentials);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`✓ ${label} copied to clipboard!`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm sm:text-base text-slate-600 mt-2">Manage your integrations and configurations</p>
        {hasUnsavedChanges && (
          <div className="mt-2 text-sm text-amber-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            You have unsaved changes (press Ctrl+S to save)
          </div>
        )}
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

        {/* WhatsApp Integration Tab - PART 1 in next message */}
        {activeTab === 'whatsapp' && (
          <div className="p-4 sm:p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                  📱 WhatsApp Business API
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Connect your Meta WhatsApp Cloud API to send and receive messages
                </p>
              </div>
              {webhookUrls && (
                <a
                  href="https://www.youtube.com/results?search_query=whatsapp+cloud+api+setup+2026"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  ▶️ Video Tutorial
                </a>
              )}
            </div>

            {/* Connection Status Card */}
            {whatsappIntegration && (
              <ConnectionStatusCard
                type="whatsapp"
                status="connected"
                metrics={{
                  ...whatsappIntegration,
                  lastSync: whatsappIntegration.lastHealthCheck,
                }}
                onDisconnect={handleDeleteWhatsApp}
                onTest={() => {}}
              />
            )}

            {/* Configuration Form */}
            <form onSubmit={handleWhatsAppSubmit} className="space-y-5">
              <InlineFieldValidator
                label="Phone Number ID"
                value={whatsappForm.phoneNumberId}
                onChange={(value) => {
                  setWhatsappForm({ ...whatsappForm, phoneNumberId: value });
                  setHasUnsavedChanges(true);
                }}
                placeholder="123456789012345"
                required
                validator={validators.isNumeric}
                helpText="Found in: Use cases (pencil icon) → Customize → API Setup panel"
                exampleText="Example: 123456789012345"
              />

              <InlineFieldValidator
                label="Phone Number"
                value={whatsappForm.phoneNumber}
                onChange={(value) => {
                  setWhatsappForm({ ...whatsappForm, phoneNumber: value });
                  setHasUnsavedChanges(true);
                }}
                placeholder="+923001234567"
                type="tel"
                required
                validator={validators.e164Phone}
                exampleText="Pakistan: +92, US: +1, UK: +44, India: +91"
              />

              <InlineFieldValidator
                label="Business Account ID"
                value={whatsappForm.businessAccountId}
                onChange={(value) => {
                  setWhatsappForm({ ...whatsappForm, businessAccountId: value });
                  setHasUnsavedChanges(true);
                }}
                placeholder="123456789012345"
                required
                validator={validators.isNumeric}
                helpText="Found in Meta Business Settings → WhatsApp Accounts"
                exampleText="Example: 123456789012345"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                  <span>
                    Access Token <span className="text-red-500">*</span>
                  </span>
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
                  onChange={(e) => {
                    setWhatsappForm({ ...whatsappForm, accessToken: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="EAAG..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
                
                {/* Help Section - Collapsed by Default */}
                {showTokenHelp && (
                  <div className="mt-3 bg-gradient-to-br from-primary-50 to-blue-50 border border-primary-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start gap-2 mb-3">
                      <svg className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <h4 className="font-semibold text-primary-900 text-sm">How to Generate WhatsApp Access Token</h4>
                        <p className="text-xs text-primary-700 mt-1">Two options: System User Token (recommended) or Temporary Token (testing only)</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTokenHelp(false)}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {/* System User Token (Recommended) */}
                      <details className="bg-white rounded-lg p-3 border border-green-200" open>
                        <summary className="font-semibold text-sm cursor-pointer flex items-center gap-2">
                          <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded">RECOMMENDED</span>
                          <span>System User Token (Never Expires)</span>
                        </summary>
                        <ol className="text-xs text-gray-700 space-y-2 list-decimal list-inside ml-1 mt-3">
                          <li>
                            Go to{' '}
                            <a
                              href="https://business.facebook.com/settings/system-users"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:underline font-medium"
                            >
                              Meta Business Settings → System Users
                            </a>
                          </li>
                          <li>Click "Add" to create a System User</li>
                          <li>Click on the System User → "Generate Token"</li>
                          <li>Select your WhatsApp App and check these permissions:
                            <ul className="ml-6 mt-1 space-y-0.5 list-disc">
                              <li><code className="bg-gray-100 px-1">whatsapp_business_messaging</code></li>
                              <li><code className="bg-gray-100 px-1">whatsapp_business_management</code></li>
                            </ul>
                          </li>
                          <li className="font-semibold text-green-700">Set expiration to "Never" ✨</li>
                          <li>Copy the token and paste above</li>
                        </ol>
                      </details>

                      {/* Temporary Token */}
                      <details className="bg-white rounded-lg p-3 border border-amber-200">
                        <summary className="font-semibold text-sm cursor-pointer flex items-center gap-2">
                          <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded">TESTING ONLY</span>
                          <span>Temporary Token (24 Hours)</span>
                        </summary>
                        <ol className="text-xs text-gray-700 space-y-2 list-decimal list-inside ml-1 mt-3">
                          <li>
                            Go to{' '}
                            <a
                              href="https://developers.facebook.com/apps"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:underline font-medium"
                            >
                              Meta App Dashboard
                            </a>
                          </li>
                          <li>Select your WhatsApp App → WhatsApp → API Setup</li>
                          <li>Copy the "Temporary access token"</li>
                          <li className="text-amber-800 font-medium">⚠️ Expires in 24 hours!</li>
                        </ol>
                      </details>
                    </div>
                  </div>
                )}
              </div>

              {/* Webhook Info with Copy Button */}
              {webhookUrls && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 mb-2">Webhook Configuration</p>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs font-semibold text-blue-800">Callback URL:</label>
                          <div className="flex gap-2 mt-1">
                            <input
                              type="text"
                              readOnly
                              value={webhookUrls.whatsapp.callbackUrl}
                              className="flex-1 text-xs bg-white px-2 py-1.5 rounded border border-blue-300 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => copyToClipboard(webhookUrls.whatsapp.callbackUrl, 'Webhook URL')}
                              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                            >
                              📋 Copy
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-blue-800">Verify Token:</label>
                          <div className="flex gap-2 mt-1">
                            <input
                              type="text"
                              readOnly
                              value={webhookUrls.whatsapp.verifyToken}
                              className="flex-1 text-xs bg-white px-2 py-1.5 rounded border border-blue-300 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => copyToClipboard(webhookUrls.whatsapp.verifyToken, 'Verify Token')}
                              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                            >
                              📋 Copy
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Connection Tester */}
              <ConnectionTester
                type="whatsapp"
                credentials={whatsappForm}
                onTest={handleTestWhatsApp}
                disabled={!whatsappForm.phoneNumberId || !whatsappForm.businessAccountId || !whatsappForm.accessToken}
              />

              {/* Submit Button */}
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
                    '💾 Update WhatsApp Configuration'
                  ) : (
                    '🚀 Connect WhatsApp Business'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Shopify Integration Tab - Simplified version (similar structure) */}
        {activeTab === 'shopify' && (
          <div className="p-4 sm:p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                  🛍️ Shopify Store
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Connect your Shopify store to sync orders automatically
                </p>
              </div>
            </div>

            {/* Connection Status Card */}
            {shopifyStore && (
              <ConnectionStatusCard
                type="shopify"
                status="connected"
                metrics={{
                  ...shopifyStore,
                  lastSync: shopifyStore.lastSyncAt || undefined,
                }}
                onDisconnect={handleDeleteShopify}
              />
            )}

            {/* Configuration Form */}
            <form onSubmit={handleShopifySubmit} className="space-y-5">
              <InlineFieldValidator
                label="Shop Domain"
                value={shopifyForm.shopDomain}
                onChange={(value) => {
                  setShopifyForm({ ...shopifyForm, shopDomain: value });
                  setHasUnsavedChanges(true);
                }}
                placeholder="yourstore.myshopify.com"
                required
                validator={validators.shopifyDomain}
                exampleText="Example: mystore.myshopify.com"
              />

              <InlineFieldValidator
                label="Client ID"
                value={shopifyForm.clientId}
                onChange={(value) => {
                  setShopifyForm({ ...shopifyForm, clientId: value });
                  setHasUnsavedChanges(true);
                }}
                placeholder="shp_..."
                required
                helpText="Found in Shopify Partners → Apps → Your App → Client ID"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Secret <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={shopifyForm.clientSecret}
                  onChange={(e) => {
                    setShopifyForm({ ...shopifyForm, clientSecret: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="shpss_..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Found in Shopify Partners → Apps → Your App → Client Secret
                </p>
              </div>

              {/* Connection Tester */}
              <ConnectionTester
                type="shopify"
                credentials={shopifyForm}
                onTest={handleTestShopify}
                disabled={!shopifyForm.shopDomain || !shopifyForm.clientId || !shopifyForm.clientSecret}
              />

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isShopifyLoading}
                  className="w-full h-14 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white px-6 rounded-xl font-semibold transition-all disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow-md"
                >
                  {isShopifyLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : shopifyStore ? (
                    '💾 Update Shopify Configuration'
                  ) : (
                    '🚀 Connect Shopify Store'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
