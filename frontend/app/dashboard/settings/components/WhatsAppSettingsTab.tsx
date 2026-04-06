'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PermissionGate } from '@/components/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { useAuthStore } from '@/lib/store/auth';
import { settingsApi } from '@/lib/api/settings';
import { WhatsAppIntegration } from './types';

interface WhatsAppSettingsTabProps {
  onConnectionChange?: (connected: boolean) => void;
}

export function WhatsAppSettingsTab({ onConnectionChange }: WhatsAppSettingsTabProps) {
  const { token } = useAuthStore();

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

  const loadWhatsAppIntegration = async () => {
    if (!token) return;
    try {
      const data = await settingsApi.getWhatsAppIntegration(token);
      setWhatsappIntegration(data || null);
      onConnectionChange?.(Boolean(data));
    } catch (error: any) {
      console.error('Failed to load WhatsApp integration:', error);
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
    loadWhatsAppIntegration();
    loadWebhookConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (whatsappIntegration) {
      setWhatsappForm({
        phoneNumberId: whatsappIntegration.phoneNumberId,
        phoneNumber: whatsappIntegration.phoneNumber,
        businessAccountId: whatsappIntegration.businessAccountId,
        accessToken: '',
        tokenType: whatsappIntegration.tokenType || 'system-user',
      });
    }
  }, [whatsappIntegration]);

  const handleHealthCheck = async () => {
    if (!token || !whatsappIntegration) {
      toast.error('No WhatsApp integration found');
      return;
    }

    setIsHealthChecking(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const url = `${apiUrl}/settings/whatsapp/${whatsappIntegration.id}/health-check`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Health check HTTP error:', response.status, errorText);
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      await loadWhatsAppIntegration();

      if (data.healthStatus === 'healthy') {
        toast.success('✅ Token is healthy and valid!');
      } else if (data.healthStatus === 'warning') {
        toast('⚠️ Token is valid but expiring soon', { icon: '⚠️' });
      } else {
        const errorMsg = data.healthError || 'Unknown error';
        const isAuthError =
          errorMsg.includes('session has been invalidated') ||
          errorMsg.includes('changed their password') ||
          errorMsg.includes('validating access token') ||
          errorMsg.includes('Error validating');

        if (isAuthError) {
          toast(
            (t) => (
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
                  <div className="text-sm font-semibold text-slate-900 mb-2">How to fix:</div>
                  <ol className="text-xs text-slate-600 space-y-1 ml-4 list-decimal">
                    <li>
                      Go to{' '}
                      <a href="https://developers.facebook.com/" target="_blank" className="text-blue-600 underline" rel="noreferrer">
                        Meta Developers Console
                      </a>
                    </li>
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
            ),
            {
              duration: 15000,
              icon: '🔐',
            }
          );
        } else {
          toast.error(`❌ Token validation failed: ${errorMsg}`);
        }
      }
    } catch (error: any) {
      toast.error(`Failed to check token health: ${error.message}`);
      console.error('Health check error:', error);
    } finally {
      setIsHealthChecking(false);
    }
  };

  const handleWhatsAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsWhatsappLoading(true);

    try {
      if (whatsappIntegration) {
        const updated = await settingsApi.updateWhatsAppIntegration(token, whatsappIntegration.id, whatsappForm);
        setWhatsappIntegration(updated);
        onConnectionChange?.(true);
        await loadWebhookConfig();
        toast.success('WhatsApp integration updated successfully! ✓');
      } else {
        const created = await settingsApi.createWhatsAppIntegration(token, whatsappForm);
        setWhatsappIntegration(created);
        onConnectionChange?.(true);
        await loadWebhookConfig();
        toast.success('WhatsApp integration created successfully! 🎉');

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

  const handleDeleteWhatsApp = async () => {
    if (!token || !whatsappIntegration) return;

    toast(
      (t) => (
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
                  onConnectionChange?.(false);
                  const gracePeriodDate = new Date(result.gracePeriodEnds).toLocaleDateString();
                  toast.success(`WhatsApp disconnected. You can restore it until ${gracePeriodDate}`, {
                    duration: 5000,
                  });
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
      ),
      { duration: Infinity }
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center">
          <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-primary-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          WhatsApp Business API
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Connect your Meta WhatsApp Cloud API to send and receive messages from customers
        </p>
      </div>

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
              <p className="text-xs text-gray-500 mt-2">Last checked: {new Date(whatsappIntegration.lastHealthCheck).toLocaleString()}</p>
            )}

            {whatsappIntegration.tokenExpiresAt && (
              <p className="text-xs text-gray-600 mt-1">Token expires: {new Date(whatsappIntegration.tokenExpiresAt).toLocaleDateString()}</p>
            )}
          </div>

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

      <form onSubmit={handleWhatsAppSubmit} className="space-y-5">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Phone Number ID *</label>
          <input
            type="text"
            value={whatsappForm.phoneNumberId}
            onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneNumberId: e.target.value })}
            placeholder="123456789012345"
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Found in: Use cases (pencil icon) → Customize → API Setup panel</p>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
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
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Business Account ID *</label>
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
          {!showTokenHelp && <p className="text-xs text-gray-500 mt-1">💡 Click "How to generate?" above for step-by-step instructions</p>}
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Token Type *</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setWhatsappForm({ ...whatsappForm, tokenType: 'system-user' })}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                whatsappForm.tokenType === 'system-user' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    whatsappForm.tokenType === 'system-user' ? 'border-green-500' : 'border-gray-300'
                  }`}
                >
                  {whatsappForm.tokenType === 'system-user' && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
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
                whatsappForm.tokenType === 'temporary' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    whatsappForm.tokenType === 'temporary' ? 'border-amber-500' : 'border-gray-300'
                  }`}
                >
                  {whatsappForm.tokenType === 'temporary' && <div className="w-2 h-2 bg-amber-500 rounded-full"></div>}
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
            {showSetupHelp ? 'Hide Guide' : 'View Guide'}
          </button>
        </div>

        {!showSetupHelp && (
          <p className="text-sm text-blue-700">
            💡 New to WhatsApp Cloud API? Click <strong>"View Guide"</strong> for complete setup instructions
          </p>
        )}

        {showSetupHelp && (
          <div className="mt-4 space-y-3 text-xs text-gray-700 bg-white border border-blue-200 rounded-lg p-4">
            <p>1. Create a Meta Business app with WhatsApp use case.</p>
            <p>2. Copy Phone Number ID and WhatsApp Business Account ID from API Setup.</p>
            <p>3. Generate a System User token with whatsapp_business_management and whatsapp_business_messaging.</p>
            <p>4. Paste credentials above and save integration.</p>
            <p>5. Configure webhook using the section below, then run a test message.</p>
          </div>
        )}
      </div>

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
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-all"
          >
            {showWebhookConfig ? 'Hide Config' : 'View Config'}
          </button>
        </div>

        {!showWebhookConfig && (
          <p className="text-sm text-amber-700">
            💡 Click <strong>"View Config"</strong> to configure webhook for receiving messages
          </p>
        )}

        {showWebhookConfig && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 border border-amber-200">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-amber-900 text-sm">Callback URL</span>
                <button
                  type="button"
                  onClick={() => {
                    const url = webhookConfig?.whatsapp?.callbackUrl || 'Loading...';
                    navigator.clipboard.writeText(url);
                    toast.success('Webhook URL copied to clipboard!');
                  }}
                  disabled={!webhookConfig}
                  className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium rounded border border-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Copy URL
                </button>
              </div>
              <code className="block bg-white text-green-900 px-3 py-2.5 rounded text-xs font-mono break-all border border-green-200">
                {webhookConfig?.whatsapp?.callbackUrl || 'Loading webhook configuration...'}
              </code>
            </div>

            <div className="bg-white rounded-lg p-4 border border-amber-200">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-amber-900 text-sm">Verify Token</span>
                <button
                  type="button"
                  onClick={() => {
                    const verifyToken = webhookConfig?.whatsapp?.verifyToken || 'Loading...';
                    navigator.clipboard.writeText(verifyToken);
                    toast.success('Verify token copied to clipboard!');
                  }}
                  disabled={!webhookConfig}
                  className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium rounded border border-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Copy Token
                </button>
              </div>
              <code className="block bg-white text-green-900 px-3 py-2 rounded text-xs font-mono border border-green-300 break-all">
                {webhookConfig?.whatsapp?.verifyToken || 'Loading...'}
              </code>
            </div>

            <div className="bg-green-50 border border-green-300 rounded-lg p-4">
              <h4 className="font-bold text-green-900 text-sm mb-2">✅ Action Checklist</h4>
              <ol className="space-y-1.5 text-xs text-green-800 list-decimal ml-4">
                <li>Open Meta Dashboard → WhatsApp → Configuration → Webhook</li>
                <li>Paste Callback URL and Verify Token</li>
                <li>Click Verify and Save</li>
                <li>Subscribe only to <code className="bg-green-100 px-1 rounded">messages</code></li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
