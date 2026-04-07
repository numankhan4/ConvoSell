'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PermissionGate } from '@/components/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { useAuthStore } from '@/lib/store/auth';
import { settingsApi } from '@/lib/api/settings';
import { disconnectOAuth, getOAuthInstallUrl } from '@/lib/api/shopify-oauth';
import { ShopifyStore } from './types';
import { ShopifyManualWebhookSetup } from './ShopifyManualWebhookSetup';

interface ShopifySettingsTabProps {
  onConnectionChange?: (connected: boolean) => void;
}

export function ShopifySettingsTab({ onConnectionChange }: ShopifySettingsTabProps) {
  const { token } = useAuthStore();

  const [shopifyStore, setShopifyStore] = useState<ShopifyStore | null>(null);
  const [shopifyForm, setShopifyForm] = useState({
    shopDomain: '',
    clientId: '',
    clientSecret: '',
    scopes: 'read_orders,write_orders,read_customers,write_customers',
  });
  const [isShopifyLoading, setIsShopifyLoading] = useState(false);
  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);
  const [oauthShopDomain, setOauthShopDomain] = useState('');
  const [showLegacyForm, setShowLegacyForm] = useState(false);
  const [webhookConfig, setWebhookConfig] = useState<any>(null);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  const shopifyWebhookEndpoint =
    webhookConfig?.shopify?.orderWebhookUrl ||
    webhookConfig?.shopify?.callbackUrl ||
    webhookConfig?.shopify?.webhookUrl ||
    `${apiBaseUrl}/webhooks/shopify`;

  const loadShopifyStore = async () => {
    if (!token) return;
    try {
      const data = await settingsApi.getShopifyStore(token);
      setShopifyStore(data || null);
      onConnectionChange?.(Boolean(data));
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

  useEffect(() => {
    loadShopifyStore();
    loadWebhookConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (shopifyStore) {
      setShopifyForm({
        shopDomain: shopifyStore.shopDomain,
        clientId: shopifyStore.clientId,
        clientSecret: '',
        scopes: shopifyStore.scopes,
      });
    }
  }, [shopifyStore]);

  useEffect(() => {
    const checkOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const shopifyParam = urlParams.get('shopify');
      const shopParam = urlParams.get('shop');
      const webhookStatus = urlParams.get('webhooks');
      const webhookError = urlParams.get('webhook_error');
      const failedTopics = urlParams.get('webhook_failed_topics');

      if (shopifyParam === 'connected' && shopParam) {
        if (webhookStatus === 'ok' || !webhookStatus) {
          toast.success(`✅ ${shopParam} connected successfully!`);
        } else {
          const failedList = failedTopics
            ? failedTopics.split(',').join(', ')
            : 'some required topics';

          if (webhookError === 'protected_customer_data') {
            toast.error(
              `Connected to ${shopParam}, but Shopify blocked protected-data webhooks (${failedList}). Approve Protected Customer Data in Partner Dashboard and reconnect.`,
              { duration: 9000 },
            );
          } else {
            toast.error(
              `Connected to ${shopParam}, but webhook setup is partial (${failedList}). Please retry webhook registration in Settings.`,
              { duration: 8000 },
            );
          }
        }

        await loadShopifyStore();
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    checkOAuthCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShopifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsShopifyLoading(true);

    try {
      if (shopifyStore) {
        const updated = await settingsApi.updateShopifyStore(token, shopifyStore.id, shopifyForm);
        setShopifyStore(updated);
        onConnectionChange?.(true);
        toast.success('Shopify store updated successfully! ✓');
      } else {
        const created = await settingsApi.createShopifyStore(token, shopifyForm);
        setShopifyStore(created);
        onConnectionChange?.(true);
        toast.success('Shopify store connected successfully! 🎉');

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

  const handleDeleteShopify = async () => {
    if (!token || !shopifyStore) return;

    toast(
      (t) => (
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
                  onConnectionChange?.(false);
                  const gracePeriodDate = new Date(result.gracePeriodEnds).toLocaleDateString();
                  toast.success(`Shopify disconnected. You can restore it until ${gracePeriodDate}`, {
                    duration: 5000,
                  });
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
      ),
      { duration: Infinity }
    );
  };

  const handleOAuthConnect = async () => {
    if (!token || !oauthShopDomain.trim()) {
      toast.error('Please enter a shop domain');
      return;
    }

    try {
      setIsConnectingOAuth(true);
      const { installUrl } = await getOAuthInstallUrl(oauthShopDomain.trim());
      window.location.href = installUrl;
    } catch (error: any) {
      setIsConnectingOAuth(false);
      toast.error(error.response?.data?.message || 'Failed to start OAuth flow');
    }
  };

  const handleOAuthDisconnect = async () => {
    if (!token) return;

    toast(
      (t) => (
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
                  await loadShopifyStore();
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
      ),
      { duration: Infinity }
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-3">
            <img src="/icons/shopify-logo.png" alt="Shopify" className="w-8 h-8" />
            Shopify Store
          </h2>
          <p className="text-sm text-slate-600 mt-1">Connect your Shopify store to sync orders automatically</p>
        </div>
      </div>

      {shopifyStore && shopifyStore.tokenType === 'oauth' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-semibold text-green-900 mb-2">✅ Connected via OAuth</h3>
              <p className="text-sm text-green-700">
                Store: <span className="font-mono font-semibold">{shopifyStore.shopDomain}</span>
              </p>
              {shopifyStore.oauthInstalledAt && (
                <p className="text-sm text-green-700">Installed: {new Date(shopifyStore.oauthInstalledAt).toLocaleDateString()}</p>
              )}
              <p className="text-xs text-green-600 mt-2">Scopes: {shopifyStore.scopes?.split(',').join(', ')}</p>
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

          <ShopifyManualWebhookSetup webhookEndpoint={shopifyWebhookEndpoint} />
        </div>
      )}

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

      {!shopifyStore && !showLegacyForm && (
        <div className="border border-slate-200 rounded-xl p-6 space-y-4 bg-gradient-to-br from-green-50 to-blue-50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 mb-1">Secure OAuth Connection</h3>
              <p className="text-sm text-slate-600">
                Connect your Shopify store securely with one click. No manual credentials needed. Your access token will never expire until you uninstall the app.
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
                {isConnectingOAuth ? 'Connecting...' : 'Connect Shopify'}
              </button>
            </PermissionGate>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-slate-600 hover:text-slate-900 font-medium">Advanced: Use manual credentials (legacy)</summary>
            <p className="text-xs text-slate-500 mt-2">Not recommended for production. OAuth provides better security and permanent tokens.</p>
            <button onClick={() => setShowLegacyForm(true)} className="mt-2 text-blue-600 hover:text-blue-700 text-xs font-medium">
              Show manual credentials form →
            </button>
          </details>
        </div>
      )}

      {!shopifyStore && showLegacyForm && (
        <form onSubmit={handleShopifySubmit} className="space-y-5 border border-amber-200 rounded-xl p-6 bg-amber-50">
          <div className="flex items-start gap-2 mb-4 pb-4 border-b border-amber-200">
            <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <div className="font-semibold text-amber-900">Legacy Credentials (Not Recommended)</div>
              <div className="text-xs text-amber-700 mt-1">Manual credentials require token refresh every 24 hours. OAuth provides permanent tokens.</div>
            </div>
            <button type="button" onClick={() => setShowLegacyForm(false)} className="text-amber-600 hover:text-amber-800">
              ✕
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
  );
}
