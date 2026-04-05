'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth';
import { settingsApi } from '@/lib/api/settings';
import { getOAuthInstallUrl, getOAuthStatus, disconnectOAuth } from '@/lib/api/shopify-oauth';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import toast from 'react-hot-toast';

interface WhatsAppIntegration {
  id: string;
  phoneNumberId: string;
  phoneNumber: string;
  businessAccountId: string;
  isActive: boolean;
  tokenType?: string;
  tokenExpiresAt?: string;
  healthStatus?: string;
  healthError?: string;
  lastHealthCheck?: string;
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
  tokenType?: string;
  oauthInstalledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const { token } = useAuthStore();
  const { role, isOwner, isAdmin, hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'shopify'>('whatsapp');

  // WhatsApp state
  const [whatsappIntegration, setWhatsappIntegration] = useState<WhatsAppIntegration | null>(null);
  const [whatsappForm, setWhatsappForm] = useState({
    phoneNumberId: '',
    phoneNumber: '',
    businessAccountId: '',
    accessToken: '',
    tokenType: 'system-user',
  });
  const [isWhatsappLoading, setIsWhatsappLoading] = useState(false);
  const [isHealthChecking, setIsHealthChecking] = useState(false);
  const [showTokenHelp, setShowTokenHelp] = useState(false);
  const [showSetupHelp, setShowSetupHelp] = useState(false);
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);
  const [webhookConfig, setWebhookConfig] = useState<any>(null);

  // Shopify state
  const [shopifyStore, setShopifyStore] = useState<ShopifyStore | null>(null);
  const [shopifyForm, setShopifyForm] = useState({
    shopDomain: '',
    clientId: '',
    clientSecret: '',
    scopes: 'read_orders,write_orders,read_customers,write_customers',
  });
  const [isShopifyLoading, setIsShopifyLoading] = useState(false);
  
  // OAuth state
  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);
  const [oauthShopDomain, setOauthShopDomain] = useState('');
  const [showLegacyForm, setShowLegacyForm] = useState(false);

  // Load WhatsApp integration on mount
  useEffect(() => {
    loadWhatsAppIntegration();
    loadShopifyStore();
    loadWebhookConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Populate WhatsApp form when integration is loaded
  useEffect(() => {
    if (whatsappIntegration) {
      setWhatsappForm({
        phoneNumberId: whatsappIntegration.phoneNumberId,
        phoneNumber: whatsappIntegration.phoneNumber,
        businessAccountId: whatsappIntegration.businessAccountId,
        accessToken: '', // Don't show existing token for security
        tokenType: whatsappIntegration.tokenType || 'system-user',
      });
    }
  }, [whatsappIntegration]);

  // Health check function
  const handleHealthCheck = async () => {
    if (!token || !whatsappIntegration) {
      toast.error('No WhatsApp integration found');
      return;
    }

    setIsHealthChecking(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const url = `${apiUrl}/settings/whatsapp/${whatsappIntegration.id}/health-check`;
      
      console.log('Health check URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Health check HTTP error:', response.status, errorText);
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Health check response:', data);
      
      // Reload integration to get updated health status
      await loadWhatsAppIntegration();
      
      if (data.healthStatus === 'healthy') {
        toast.success('✅ Token is healthy and valid!');
      } else if (data.healthStatus === 'warning') {
        toast('⚠️ Token is valid but expiring soon', { icon: '⚠️' });
      } else {
        // Check for specific Meta/Facebook auth errors
        const errorMsg = data.healthError || 'Unknown error';
        const isAuthError = errorMsg.includes('session has been invalidated') || 
                           errorMsg.includes('changed their password') ||
                           errorMsg.includes('validating access token') ||
                           errorMsg.includes('Error validating');
        
        if (isAuthError) {
          toast((t) => (
            <div className="space-y-3 max-w-md">
              <div>
                <div className="font-semibold text-red-900 mb-2">🔐 Token Invalidated by Meta</div>
                <div className="text-sm text-slate-700 mb-2">
                  Your access token has been invalidated by Facebook/Meta. This happens when:
                </div>
                <ul className="text-xs text-slate-600 space-y-1 ml-4 mb-3">
                  <li>• Facebook password was changed</li>
                  <li>• Meta invalidated session for security</li>
                  <li>• Token was manually revoked</li>
                </ul>
                <div className="text-sm font-semibold text-slate-900 mb-2">
                  How to fix:
                </div>
                <ol className="text-xs text-slate-600 space-y-1 ml-4 list-decimal">
                  <li>Go to <a href="https://developers.facebook.com/" target="_blank" className="text-blue-600 underline">Meta Developers Console</a></li>
                  <li>Select your WhatsApp app</li>
                  <li>Go to Tools → Access Token Tool</li>
                  <li>Generate a new System User Token</li>
                  <li>Update the token in the form above</li>
                </ol>
              </div>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  setShowTokenHelp(true);
                }}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Show Token Generation Guide
              </button>
            </div>
          ), {
            duration: 15000,
            icon: '🔐',
          });
        } else {
          toast.error('❌ Token validation failed: ' + errorMsg);
        }
      }
    } catch (error: any) {
      toast.error('Failed to check token health: ' + error.message);
      console.error('Health check error:', error);
    } finally {
      setIsHealthChecking(false);
    }
  };

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

  const loadWebhookConfig = async () => {
    if (!token) return;
    try {
      const data = await settingsApi.getWebhookUrls(token);
      if (data) {
        setWebhookConfig(data);
      }
    } catch (error: any) {
      console.error('Failed to load webhook configuration:', error);
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
        await loadWebhookConfig(); // Reload webhook config
        toast.success('WhatsApp integration updated successfully! ✓');
      } else {
        // Create new
        const created = await settingsApi.createWhatsAppIntegration(token, whatsappForm);
        setWhatsappIntegration(created);
        await loadWebhookConfig(); // Load webhook config for new integration
        toast.success('WhatsApp integration created successfully! 🎉');
        
        // Reset form only after creation
        setWhatsappForm({
          phoneNumberId: '',
          phoneNumber: '',
          businessAccountId: '',
          accessToken: '',
          tokenType: 'system-user',
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
          <div className="text-sm text-slate-600 mt-1">
            Your integration will be disconnected but can be restored within 30 days.
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const result = await settingsApi.disconnectWhatsAppIntegration(whatsappIntegration.id);
                setWhatsappIntegration(null);
                const gracePeriodDate = new Date(result.gracePeriodEnds).toLocaleDateString();
                toast.success(
                  `WhatsApp disconnected. You can restore it until ${gracePeriodDate}`,
                  { duration: 5000 }
                );
              } catch (error: any) {
                toast.error(error.response?.data?.message || 'Failed to disconnect integration');
              }
            }}
            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Disconnect
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
          <div className="text-sm text-slate-600 mt-1">
            Your store will be disconnected but can be restored within 90 days.
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const result = await settingsApi.disconnectShopifyStore(shopifyStore.id);
                setShopifyStore(null);
                const gracePeriodDate = new Date(result.gracePeriodEnds).toLocaleDateString();
                toast.success(
                  `Shopify disconnected. You can restore it until ${gracePeriodDate}`,
                  { duration: 5000 }
                );
              } catch (error: any) {
                toast.error(error.response?.data?.message || 'Failed to disconnect store');
              }
            }}
            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Disconnect
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
        // Check if any errors are about protected customer data
        const hasDataAccessError = results.some((r: any) => 
          !r.success && r.error?.includes('protected customer data')
        );
        
        if (hasDataAccessError) {
          toast.error(
            '⚠️ Shopify requires approval to access protected customer data. See "Setup Instructions" below for help.',
            { duration: 8000 }
          );
        } else {
          toast.error(`⚠️ ${successCount} succeeded, ${failCount} failed. Check console for details.`);
        }
      }
      console.log('Webhook registration results:', results);
    } catch (error: any) {
      console.error('Webhook registration error:', error);
      toast.error(error.response?.data?.message || 'Failed to register webhooks');
    }
  };

  // OAuth handlers
  const handleOAuthConnect = async () => {
    if (!token || !oauthShopDomain.trim()) {
      toast.error('Please enter a shop domain');
      return;
    }

    try {
      setIsConnectingOAuth(true);
      const { installUrl } = await getOAuthInstallUrl(oauthShopDomain.trim());
      
      // Redirect to Shopify OAuth screen
      window.location.href = installUrl;
    } catch (error: any) {
      setIsConnectingOAuth(false);
      toast.error(error.response?.data?.message || 'Failed to start OAuth flow');
    }
  };

  const handleOAuthDisconnect = async () => {
    if (!token) return;

    toast((t) => (
      <div className="space-y-3">
        <div>
          <div className="font-semibold text-slate-900">Disconnect Shopify OAuth?</div>
          <div className="text-sm text-slate-600 mt-1">You can reconnect anytime.</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await disconnectOAuth();
                await loadShopifyStore(); // Reload to show disconnected state
                toast.success('Shopify disconnected successfully!');
              } catch (error: any) {
                toast.error(error.response?.data?.message || 'Failed to disconnect');
              }
            }}
            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Disconnect
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

  // Check for OAuth callback on mount
  useEffect(() => {
    const checkOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const shopifyParam = urlParams.get('shopify');
      const shopParam = urlParams.get('shop');

      if (shopifyParam === 'connected' && shopParam) {
        toast.success(`✅ ${shopParam} connected successfully!`);
        await loadShopifyStore(); // Reload shop data
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    checkOAuthCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Settings</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              role === 'owner' ? 'bg-purple-100 text-purple-800' :
              role === 'admin' ? 'bg-blue-100 text-blue-800' :
              role === 'manager' ? 'bg-green-100 text-green-800' :
              role === 'agent' ? 'bg-orange-100 text-orange-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {role}
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-600">Manage your integrations and configurations</p>
        </div>
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
                <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
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
                Connect your Meta WhatsApp Cloud API to send and receive messages from customers
              </p>
            </div>

          {/* Current Integration Status */}
          {whatsappIntegration && (
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 border-2 border-primary-200 rounded-xl p-6 shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center shadow-sm">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-primary-900 text-lg">WhatsApp Connected</h3>
                      <p className="text-xs text-primary-700">Integration is active and ready</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3 border border-primary-200 shadow-sm">
                      <p className="text-xs text-primary-600 font-medium mb-1">Phone Number</p>
                      <p className="text-sm font-mono font-semibold text-primary-900">{whatsappIntegration.phoneNumber}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-primary-200 shadow-sm">
                      <p className="text-xs text-primary-600 font-medium mb-1">Phone Number ID</p>
                      <p className="text-xs font-mono font-semibold text-primary-900">{whatsappIntegration.phoneNumberId}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-primary-200 shadow-sm">
                      <p className="text-xs text-primary-600 font-medium mb-1">Business Account ID</p>
                      <p className="text-xs font-mono font-semibold text-primary-900">{whatsappIntegration.businessAccountId}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-primary-200 shadow-sm">
                      <p className="text-xs text-primary-600 font-medium mb-1">Token Type</p>
                      <p className="text-sm font-semibold text-primary-900 capitalize">{whatsappIntegration.tokenType || 'temporary'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Health Status */}
              <div className="bg-white rounded-lg p-4 border-2 border-primary-200 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0121 12c0 6.627-5.373 12-12 12S-3 18.627-3 12 2.373 0 9 0c2.913 0 5.562 1.078 7.618 2.984z" />
                    </svg>
                    Token Health Status
                  </h4>
                  <PermissionGate permission={Permissions.SETTINGS_VIEW}>
                    <button
                      onClick={handleHealthCheck}
                      disabled={isHealthChecking}
                      className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition-all disabled:bg-gray-400 flex items-center gap-1.5 shadow-sm hover:shadow-md"
                    >
                    {isHealthChecking ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Checking...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Check Now
                      </>
                    )}
                  </button>
                  </PermissionGate>
                </div>

                <div className="flex items-center gap-3">
                  {/* Health Status Indicator */}
                  {whatsappIntegration.healthStatus === 'healthy' && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg flex-1">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <div>
                        <p className="text-sm font-semibold text-green-900">Healthy</p>
                        <p className="text-xs text-green-700">Token is valid and active</p>
                      </div>
                    </div>
                  )}
                  {whatsappIntegration.healthStatus === 'warning' && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex-1">
                      <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                      <div>
                        <p className="text-sm font-semibold text-amber-900">Warning</p>
                        <p className="text-xs text-amber-700">Token expiring soon</p>
                      </div>
                    </div>
                  )}
                  {whatsappIntegration.healthStatus === 'error' && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex-1">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-semibold text-red-900">Error</p>
                        <p className="text-xs text-red-700">{whatsappIntegration.healthError || 'Token validation failed'}</p>
                      </div>
                    </div>
                  )}
                  {!whatsappIntegration.healthStatus && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg flex-1">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Not Checked</p>
                        <p className="text-xs text-gray-600">Click "Check Now" to validate token</p>
                      </div>
                    </div>
                  )}
                </div>

                {whatsappIntegration.lastHealthCheck && (
                  <p className="text-xs text-gray-500 mt-2">
                    Last checked: {new Date(whatsappIntegration.lastHealthCheck).toLocaleString()}
                  </p>
                )}

                {whatsappIntegration.tokenExpiresAt && (
                  <p className="text-xs text-gray-600 mt-1">
                    Token expires: {new Date(whatsappIntegration.tokenExpiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <PermissionGate permission={Permissions.INTEGRATIONS_DISCONNECT}>
                  <button
                    onClick={handleDeleteWhatsApp}
                    className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors border border-red-200 shadow-sm hover:shadow-md"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Disconnect WhatsApp
                    </span>
                  </button>
                </PermissionGate>
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
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-mono"
                required
              />
              {!showTokenHelp && (
                <p className="text-xs text-gray-500 mt-1">
                  💡 Click "How to generate?" above for step-by-step instructions
                </p>
              )}
            </div>

            {/* Token Type Selector */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Token Type *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setWhatsappForm({ ...whatsappForm, tokenType: 'system-user' })}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    whatsappForm.tokenType === 'system-user'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      whatsappForm.tokenType === 'system-user' ? 'border-green-500' : 'border-gray-300'
                    }`}>
                      {whatsappForm.tokenType === 'system-user' && (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      )}
                    </div>
                    <span className="font-semibold text-sm text-gray-900">System User</span>
                    <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded font-bold">BEST</span>
                  </div>
                  <p className="text-xs text-gray-600 ml-6">Never expires, production-ready</p>
                </button>
                <button
                  type="button"
                  onClick={() => setWhatsappForm({ ...whatsappForm, tokenType: 'temporary' })}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    whatsappForm.tokenType === 'temporary'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      whatsappForm.tokenType === 'temporary' ? 'border-amber-500' : 'border-gray-300'
                    }`}>
                      {whatsappForm.tokenType === 'temporary' && (
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      )}
                    </div>
                    <span className="font-semibold text-sm text-gray-900">Temporary</span>
                    <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded font-bold">TEST</span>
                  </div>
                  <p className="text-xs text-gray-600 ml-6">Expires in 24 hours, testing only</p>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <PermissionGate 
                permission={Permissions.INTEGRATIONS_CONNECT}
                fallback={
                  <div className="w-full h-14 bg-gray-200 text-gray-600 px-6 rounded-xl font-semibold flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    You need admin permissions to manage integrations
                  </div>
                }
              >
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
              </PermissionGate>
            </div>
          </form>

          {/* Interactive Setup Guide */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-blue-900 text-base">📘 WhatsApp Setup Guide</h3>
                  <p className="text-sm text-blue-700 mt-0.5">First time? Follow our step-by-step guide</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSetupHelp(!showSetupHelp)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                {showSetupHelp ? (
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
                    View Guide
                  </>
                )}
              </button>
            </div>

            {!showSetupHelp && (
              <p className="text-sm text-blue-700">
                💡 New to WhatsApp Cloud API? Click <strong>"View Guide"</strong> for complete setup instructions
              </p>
            )}

            {showSetupHelp && (
              <div className="mt-4 space-y-4">
                {/* Step 1: Create WhatsApp App */}
                <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">1</span>
                    </div>
                    <h4 className="font-bold text-purple-900 text-sm">Create WhatsApp Business App</h4>
                  </div>
                  <div className="ml-11 space-y-2 text-xs text-gray-700">
                    <p>✅ Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline font-semibold">Meta for Developers</a></p>
                    <p>✅ Click <strong>"Create App"</strong> → Select <strong>"Business"</strong> type</p>
                    <p>✅ Choose <strong>"Connect with customers through WhatsApp"</strong> use case</p>
                    <p>✅ Enter your app name and business email</p>
                  </div>
                </div>

                {/* Step 2: Get Credentials */}
                <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">2</span>
                    </div>
                    <h4 className="font-bold text-blue-900 text-sm">Get Phone Number ID & Business Account ID</h4>
                  </div>
                  <div className="ml-11 space-y-2 text-xs text-gray-700">
                    <p>✅ In your app, click <strong>"Use cases"</strong> → <strong>"Customize"</strong></p>
                    <p>✅ Find <strong>"API Setup"</strong> panel on the right</p>
                    <p>✅ Copy <strong>"Phone number ID"</strong> and <strong>"WhatsApp Business Account ID"</strong></p>
                    <p>✅ Paste them in the form fields above</p>
                  </div>
                </div>

                {/* Step 3: Generate Access Token */}
                <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">3</span>
                    </div>
                    <h4 className="font-bold text-green-900 text-sm">Generate Permanent Access Token</h4>
                  </div>
                  <div className="ml-11 space-y-2 text-xs text-gray-700">
                    <p>✅ Go to <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-semibold">Meta Business Settings → System Users</a></p>
                    <p>✅ Click <strong>"Add"</strong> → Create new System User (Admin role)</p>
                    <p>✅ Click on your System User → <strong>"Generate New Token"</strong></p>
                    <p>✅ Select your app, check permissions: <code className="bg-gray-100 px-1">whatsapp_business_management</code>, <code className="bg-gray-100 px-1">whatsapp_business_messaging</code></p>
                    <p>✅ Copy the token and paste in the <strong>"Access Token"</strong> field above</p>
                    <p className="text-green-700 font-medium">💡 System User tokens never expire - perfect for production!</p>
                  </div>
                </div>

                {/* Step 4: Configure Webhook */}
                <div className="bg-white rounded-lg p-4 border border-amber-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">4</span>
                    </div>
                    <h4 className="font-bold text-amber-900 text-sm">Configure Webhook (See Details Below)</h4>
                  </div>
                  <div className="ml-11 space-y-2 text-xs text-gray-700">
                    <p>✅ The <strong>Webhook Configuration</strong> section below has complete details</p>
                    <p>✅ You'll need your webhook URL and verify token</p>
                    <p>✅ Configure in Meta App → WhatsApp → Configuration → Webhook</p>
                  </div>
                </div>

                {/* Step 5: Save & Test */}
                <div className="bg-white rounded-lg p-4 border border-emerald-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">5</span>
                    </div>
                    <h4 className="font-bold text-emerald-900 text-sm">Save & Test Connection</h4>
                  </div>
                  <div className="ml-11 space-y-2 text-xs text-gray-700">
                    <p>✅ Fill all fields in the form above</p>
                    <p>✅ Click <strong>"Connect WhatsApp Business"</strong></p>
                    <p>✅ Look for green success message ✅</p>
                    <p>✅ Use <strong>"Check Now"</strong> button in health status card to verify</p>
                    <p className="text-emerald-700 font-medium">🎉 You're ready to start messaging!</p>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
                  <h4 className="font-semibold text-indigo-900 text-sm mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Quick Links
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <a 
                      href="https://developers.facebook.com/apps" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-white rounded border border-indigo-200 hover:shadow-md transition-shadow text-xs text-indigo-700 hover:text-indigo-900 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Meta Developer Dashboard
                    </a>
                    <a 
                      href="https://business.facebook.com/settings/system-users" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-white rounded border border-indigo-200 hover:shadow-md transition-shadow text-xs text-indigo-700 hover:text-indigo-900 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Meta Business Settings
                    </a>
                    <a 
                      href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-white rounded border border-indigo-200 hover:shadow-md transition-shadow text-xs text-indigo-700 hover:text-indigo-900 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Official WhatsApp Docs
                    </a>
                    <a 
                      href="https://business.facebook.com/wa/manage/home" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-white rounded border border-indigo-200 hover:shadow-md transition-shadow text-xs text-indigo-700 hover:text-indigo-900 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      WhatsApp Manager
                    </a>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSetupHelp(false)}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md"
                >
                  ✓ Got it, close guide
                </button>
              </div>
            )}
          </div>

          {/* Webhook Configuration */}
          <div className="mt-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-amber-900 text-base">🔧 Webhook Configuration</h3>
                  <p className="text-xs text-amber-700">Required for receiving customer messages</p>
                </div>
              </div>
              <button
                onClick={() => setShowWebhookConfig(!showWebhookConfig)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
              >
                {showWebhookConfig ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Hide Config
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    View Config
                  </>
                )}
              </button>
            </div>

            {!showWebhookConfig && (
              <p className="text-sm text-amber-700">
                💡 Click <strong>"View Config"</strong> to configure webhook for receiving messages
              </p>
            )}

            {showWebhookConfig && (
              <>
                {/* Quick Navigation Path */}
                <div className="bg-white border border-amber-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-xs text-amber-800">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-semibold">Meta Dashboard</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span>Your App</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span>WhatsApp</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-semibold text-amber-900">Configuration</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span>Webhook</span>
              </div>
            </div>

            <div className="space-y-3">
              {/* Step 1: Callback URL */}
              <div className="bg-white rounded-lg p-4 border border-amber-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">1</span>
                    </div>
                    <span className="font-semibold text-amber-900 text-sm">Callback URL</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const url = webhookConfig?.whatsapp?.callbackUrl || 'Loading...';
                      navigator.clipboard.writeText(url);
                      toast.success('Webhook URL copied to clipboard!');
                    }}
                    disabled={!webhookConfig}
                    className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium rounded border border-amber-300 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy URL
                  </button>
                </div>
                
                <div className="space-y-2">
                  <div className="bg-green-50 border border-green-300 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-semibold text-green-800">Your ngrok URL (Ready to Use)</span>
                    </div>
                    <code className="block bg-white text-green-900 px-3 py-2.5 rounded text-xs font-mono break-all border border-green-200">
                      {webhookConfig?.whatsapp?.callbackUrl || 'Loading webhook configuration...'}
                    </code>
                  </div>

                  {webhookConfig?.whatsapp?.securityNote && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs text-blue-800">{webhookConfig.whatsapp.securityNote}</span>
                      </div>
                    </div>
                  )}

                  {/* How to get ngrok URL helper */}
                  <details className="group">
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-center gap-2 text-xs text-amber-700 hover:text-amber-900 transition-colors p-2 rounded hover:bg-amber-100">
                        <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="font-medium">🔍 How to get your ngrok URL?</span>
                      </div>
                    </summary>
                    <div className="mt-2 ml-6 p-3 bg-amber-100/50 border border-amber-200 rounded-lg space-y-2 text-xs">
                      <div className="font-semibold text-amber-900 mb-2">📋 Quick Guide:</div>
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-2">
                          <span className="text-amber-700 font-bold">1.</span>
                          <span className="text-amber-800">Open terminal/PowerShell in your project folder</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-amber-700 font-bold">2.</span>
                          <div>
                            <span className="text-amber-800">Run: </span>
                            <code className="bg-white px-2 py-0.5 rounded border border-amber-300 font-mono text-xs">ngrok http 3000</code>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-amber-700 font-bold">3.</span>
                          <span className="text-amber-800">Copy the "Forwarding" URL (e.g., <code className="bg-white px-1 rounded">https://abc-123.ngrok-free.app</code>)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-amber-700 font-bold">4.</span>
                          <span className="text-amber-800">Add <code className="bg-white px-1 rounded">/api/whatsapp/webhook</code> to the end</span>
                        </div>
                      </div>
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs text-blue-800">
                            Your current ngrok URL is shown above. If you restart ngrok, update the webhook URL in Meta.
                          </span>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              </div>

              {/* Step 2: Verify Token */}
              <div className="bg-white rounded-lg p-4 border border-amber-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">2</span>
                    </div>
                    <span className="font-semibold text-amber-900 text-sm">Verify Token</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const token = webhookConfig?.whatsapp?.verifyToken || 'Loading...';
                      navigator.clipboard.writeText(token);
                      toast.success('Verify token copied to clipboard!');
                    }}
                    disabled={!webhookConfig}
                    className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium rounded border border-amber-300 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Token
                  </button>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <div className="font-semibold text-green-900 text-xs mb-1">🔐 Your Workspace Token</div>
                      <div className="text-xs text-green-800 mb-2">
                        This token is unique to your workspace for better security isolation
                      </div>
                      <code className="block bg-white text-green-900 px-3 py-2 rounded text-xs font-mono border border-green-300 break-all">
                        {webhookConfig?.whatsapp?.verifyToken || 'Loading...'}
                      </code>
                    </div>
                  </div>
                  <div className="text-xs text-green-700 mt-2 px-7">
                    💡 This token was automatically generated when you created your WhatsApp integration
                  </div>
                </div>
              </div>

              {/* Step 3: Subscribe to Webhook Fields */}
              <div className="bg-white rounded-lg p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xs">3</span>
                  </div>
                  <span className="font-semibold text-amber-900 text-sm">Subscribe to Webhook Fields</span>
                </div>
                
                <div className="space-y-3">
                  {/* Required Fields */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-xs font-semibold text-red-800 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      🔴 REQUIRED (Must Subscribe):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 bg-white text-red-800 px-3 py-1.5 rounded-full border border-red-300 shadow-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <code className="text-xs font-mono font-semibold">messages</code>
                      </div>
                    </div>
                    <div className="text-xs text-red-700 mt-2">
                      ✅ Includes incoming messages + delivery/read receipts • Without this, your Inbox will be empty!
                    </div>
                  </div>

                  {/* Not Available Fields */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      ⚠️ SKIP THESE (Will Fail):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 bg-white text-amber-800 px-3 py-1.5 rounded-full border border-amber-300">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <code className="text-xs font-mono font-semibold">messaging_handovers</code>
                      </div>
                    </div>
                    <div className="text-xs text-amber-700 mt-2">
                      ❌ Requires WhatsApp Platform Partner status - subscription will fail
                    </div>
                  </div>

                  {/* Optional Fields (Collapsed by default) */}
                  <details className="group">
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-center gap-2 text-xs text-blue-700 hover:text-blue-900 transition-colors p-2 rounded hover:bg-blue-50 border border-blue-200">
                        <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="font-medium">⚪ Optional Fields (Not Implemented)</span>
                      </div>
                    </summary>
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex flex-wrap gap-2">
                        <code className="text-xs bg-white text-blue-800 px-2 py-1 rounded border border-blue-300">account_alerts</code>
                        <code className="text-xs bg-white text-blue-800 px-2 py-1 rounded border border-blue-300">message_template_status_update</code>
                        <code className="text-xs bg-white text-blue-800 px-2 py-1 rounded border border-blue-300">phone_number_quality_update</code>
                      </div>
                      <div className="text-xs text-blue-700 mt-2">
                        These fields require backend implementation and are not currently in use.
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </div>

            {/* Quick Action Summary */}
            <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-green-900 text-sm mb-2">✅ Action Checklist</h4>
                  <div className="space-y-1.5 text-xs text-green-800">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold">1</span>
                      <span>Open Meta Dashboard → WhatsApp → Configuration → Webhook</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold">2</span>
                      <span>Click "Edit" and paste Callback URL + Verify Token</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold">3</span>
                      <span>Click "Verify and Save"</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold">4</span>
                      <span>Subscribe to <code className="bg-green-100 px-1 rounded">messages</code> field</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold">5</span>
                      <span>Click "Save" at the bottom</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Production Note */}
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-blue-800">
                  <strong className="font-semibold">Development vs Production:</strong> Unpublished Meta apps only receive test webhooks from test numbers. For production use with real customers, submit your app for Meta Business Verification.
                </p>
              </div>
            </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Shopify Integration Tab */}
        {activeTab === 'shopify' && (
          <div className="p-4 sm:p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-3">
                  <img src="/icons/shopify-logo.png" alt="Shopify" className="w-8 h-8" />
                  Shopify Store
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Connect your Shopify store to sync orders automatically
                </p>
              </div>
            </div>

            {/* OAuth Connection (if connected via OAuth) */}
            {shopifyStore && shopifyStore.tokenType === 'oauth' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-green-900 mb-2">✅ Connected via OAuth</h3>
                    <p className="text-sm text-green-700">
                      Store: <span className="font-mono font-semibold">{shopifyStore.shopDomain}</span>
                    </p>
                    {shopifyStore.oauthInstalledAt && (
                      <p className="text-sm text-green-700">
                        Installed: {new Date(shopifyStore.oauthInstalledAt).toLocaleDateString()}
                      </p>
                    )}
                    <p className="text-xs text-green-600 mt-2">
                      Scopes: {shopifyStore.scopes?.split(',').join(', ')}
                    </p>
                  </div>
                  <PermissionGate permission={Permissions.INTEGRATIONS_DISCONNECT}>
                    <button
                      onClick={handleOAuthDisconnect}
                      className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors border border-red-200 shadow-sm hover:shadow-md"
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Disconnect
                      </span>
                    </button>
                  </PermissionGate>
                </div>
                
                {/* Webhook Registration Section */}
                <div className="bg-white border border-green-300 rounded-lg p-4 mt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Webhook Configuration
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Webhooks notify your CRM when orders are created in Shopify. Click the button to automatically register webhooks.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleRegisterWebhooks}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Register Webhooks
                        </button>
                        <span className="text-xs text-gray-500">
                          (One-time setup for order notifications)
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-xs text-blue-800">
                      <strong>What this does:</strong> Automatically creates webhook subscriptions in Shopify for:
                    </p>
                    <ul className="text-xs text-blue-700 mt-1 ml-4 space-y-1">
                      <li>• <strong>orders/create</strong> - New orders appear in CRM instantly</li>
                      <li>• <strong>orders/updated</strong> - Order status changes sync automatically</li>
                      <li>• <strong>orders/cancelled</strong> - Cancelled orders update in CRM</li>
                    </ul>
                  </div>
                  
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded p-3">
                    <p className="text-xs text-amber-800 mb-2">
                      <strong>⚠️ API Registration Requires Approval:</strong> Shopify requires approval before custom apps can register webhooks via API.
                    </p>
                    <p className="text-xs text-amber-700 mb-2">
                      <strong>Alternative - Manual Setup (Works Immediately):</strong>
                    </p>
                    <ol className="text-xs text-amber-700 ml-4 space-y-1">
                      <li>1. Go to <strong>Shopify Admin → Settings → Notifications → Webhooks</strong></li>
                      <li>2. Click <strong>"Create webhook"</strong> and create 3 webhooks:</li>
                      <li className="ml-4">• Event: <strong>ORDERS_CREATE</strong>, Format: JSON, URL: Your webhook endpoint</li>
                      <li className="ml-4">• Event: <strong>ORDERS_UPDATED</strong>, Format: JSON, URL: Same endpoint</li>
                      <li className="ml-4">• Event: <strong>ORDERS_CANCELLED</strong>, Format: JSON, URL: Same endpoint</li>
                      <li>3. <strong>Done!</strong> Webhooks persist - you only create them once</li>
                    </ol>
                    <div className="mt-2 p-2 bg-green-50 border border-green-300 rounded">
                      <p className="text-xs text-green-800">
                        ✅ <strong>One-time setup:</strong> Once created in Shopify, webhooks keep working indefinitely. You don't need to recreate them unless you disconnect OAuth or change your webhook URL.
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3 bg-purple-50 border border-purple-200 rounded p-3">
                    <p className="text-xs text-purple-800 font-semibold mb-1">
                      🚨 Worker Service Required for Automations
                    </p>
                    <p className="text-xs text-purple-700 mb-2">
                      Webhooks will sync orders to your database, but to trigger WhatsApp automations and create inbox messages, you must run the <strong>Worker service</strong>:
                    </p>
                    <code className="text-xs bg-purple-100 px-2 py-1 rounded block font-mono mb-2">
                      cd worker && npm run start:dev
                    </code>
                    <p className="text-xs text-purple-700">
                      Without the worker, orders appear in the CRM but automation messages won't be sent automatically.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Legacy Client Credentials Connection */}
            {shopifyStore && shopifyStore.tokenType === 'client-credentials' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-amber-900 mb-2">⚠️ Connected (Legacy Mode)</h3>
                    <p className="text-sm text-amber-700">
                      Store: <span className="font-mono font-semibold">{shopifyStore.shopDomain}</span>
                    </p>
                    <p className="text-xs text-amber-600 mt-2">
                      Using Client Credentials (tokens expire every 24h). Consider switching to OAuth for permanent access.
                    </p>
                  </div>
                  <PermissionGate permission={Permissions.INTEGRATIONS_DISCONNECT}>
                    <button
                      onClick={handleDeleteShopify}
                      className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors border border-red-200 shadow-sm hover:shadow-md"
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Disconnect
                      </span>
                    </button>
                  </PermissionGate>
                </div>
              </div>
            )}

            {/* OAuth Connection UI (if not connected) */}
            {!shopifyStore && !showLegacyForm && (
              <div className="border border-slate-200 rounded-xl p-6 space-y-4 bg-gradient-to-br from-green-50 to-blue-50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">
                      Secure OAuth Connection
                    </h3>
                    <p className="text-sm text-slate-600">
                      Connect your Shopify store securely with one click. No manual credentials needed.
                      Your access token will never expire until you uninstall the app.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="your-store.myshopify.com"
                    value={oauthShopDomain}
                    onChange={(e) => setOauthShopDomain(e.target.value)}
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={isConnectingOAuth}
                  />
                  
                  <PermissionGate 
                    permission={Permissions.INTEGRATIONS_CONNECT}
                    fallback={
                      <div className="px-6 py-3 bg-gray-300 text-gray-600 rounded-lg font-semibold flex items-center gap-2 cursor-not-allowed">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Admin Only
                      </div>
                    }
                  >
                    <button
                      onClick={handleOAuthConnect}
                      disabled={isConnectingOAuth || !oauthShopDomain}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                    >
                    {isConnectingOAuth ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Connecting...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Connect Shopify
                      </>
                    )}
                  </button>
                </PermissionGate>
              </div>

              <details className="text-sm">
                  <summary className="cursor-pointer text-slate-600 hover:text-slate-900 font-medium">
                    Advanced: Use manual credentials (legacy)
                  </summary>
                  <p className="text-xs text-slate-500 mt-2">
                    Not recommended for production. OAuth provides better security and permanent tokens.
                  </p>
                  <button
                    onClick={() => setShowLegacyForm(true)}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-xs font-medium"
                  >
                    Show manual credentials form →
                  </button>
                </details>
              </div>
            )}

            {/* Legacy Manual Credentials Form */}
            {!shopifyStore && showLegacyForm && (
              <form onSubmit={handleShopifySubmit} className="space-y-5 border border-amber-200 rounded-xl p-6 bg-amber-50">
                <div className="flex items-start gap-2 mb-4 pb-4 border-b border-amber-200">
                  <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <div className="font-semibold text-amber-900">Legacy Credentials (Not Recommended)</div>
                    <div className="text-xs text-amber-700 mt-1">
                      Manual credentials require token refresh every 24 hours. OAuth provides permanent tokens.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLegacyForm(false)}
                    className="text-amber-600 hover:text-amber-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shop Domain *</label>
                  <input
                    type="text"
                    value={shopifyForm.shopDomain}
                    onChange={(e) => setShopifyForm({ ...shopifyForm, shopDomain: e.target.value })}
                    placeholder="yourstore.myshopify.com"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client ID *</label>
                  <input
                    type="text"
                    value={shopifyForm.clientId}
                    onChange={(e) => setShopifyForm({ ...shopifyForm, clientId: e.target.value })}
                    placeholder="shp_..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client Secret *</label>
                  <input
                    type="password"
                    value={shopifyForm.clientSecret}
                    onChange={(e) => setShopifyForm({ ...shopifyForm, clientSecret: e.target.value })}
                    placeholder="shpss_..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isShopifyLoading}
                    className="w-full h-14 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white px-6 rounded-xl font-semibold transition-all disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow-md"
                  >
                    {isShopifyLoading ? 'Saving...' : 'Connect with Manual Credentials'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
