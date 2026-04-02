'use client';

import { ReactNode } from 'react';

interface ConnectionMetrics {
  phoneNumber?: string;
  phoneNumberId?: string;
  shopDomain?: string;
  lastSync?: string;
  tokenExpiresAt?: string;
  isActive?: boolean;
  healthStatus?: 'healthy' | 'warning' | 'error' | 'unknown';
  healthError?: string;
  [key: string]: any;
}

interface ConnectionStatusCardProps {
  type: 'whatsapp' | 'shopify';
  status: 'connected' | 'disconnected';
  metrics?: ConnectionMetrics;
  onDisconnect?: () => void;
  onTest?: () => void;
  onReconnect?: () => void;
}

export default function ConnectionStatusCard({
  type,
  status,
  metrics,
  onDisconnect,
  onTest,
  onReconnect,
}: ConnectionStatusCardProps) {
  // Calculate health status color
  const getHealthColor = () => {
    if (status === 'disconnected') return 'gray';
    if (!metrics?.healthStatus || metrics.healthStatus === 'unknown') return 'blue';
    
    switch (metrics.healthStatus) {
      case 'healthy':
        return 'green';
      case 'warning':
        return 'yellow';
      case 'error':
        return 'red';
      default:
        return 'blue';
    }
  };

  // Get health status badge
  const getHealthBadge = () => {
    const color = getHealthColor();
    const colorClasses = {
      green: 'bg-green-100 text-green-800 border-green-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    const icons = {
      green: '🟢',
      yellow: '🟡',
      red: '🔴',
      blue: '🔵',
      gray: '⚪',
    };

    const labels = {
      green: 'Healthy',
      yellow: 'Warning',
      red: 'Error',
      blue: 'Active',
      gray: 'Disconnected',
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${colorClasses[color]}`}>
        <span>{icons[color]}</span>
        {labels[color]}
      </span>
    );
  };

  // Check for token expiry warning
  const getTokenExpiryWarning = () => {
    if (!metrics?.tokenExpiresAt) return null;
    
    const expiryDate = new Date(metrics.tokenExpiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return {
        message: '⚠️ Token expired. Please reconnect.',
        color: 'red',
      };
    } else if (daysUntilExpiry <= 7) {
      return {
        message: `⏰ Token expires in ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'day' : 'days'}. Reconnect soon.`,
        color: 'yellow',
      };
    }
    return null;
  };

  const tokenWarning = getTokenExpiryWarning();

  // Format last sync time
  const formatLastSync = (dateString?: string) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const integrationNames = {
    whatsapp: 'WhatsApp Business',
    shopify: 'Shopify Store',
  };

  const integrationIcons = {
    whatsapp: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
    ),
    shopify: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M15.337 2.487c-.043-.153-.119-.232-.255-.232h-2.571c-.187 0-.306.077-.357.255l-.476 1.632h3.735l-.076-.272zM12.678 5.142H9.965l1.989 5.954 1.734-5.954z"/>
      </svg>
    ),
  };

  const borderColor = status === 'connected' ? `border-${getHealthColor()}-200` : 'border-gray-200';
  const bgGradient = status === 'connected' 
    ? `from-${getHealthColor()}-50 to-${getHealthColor()}-100`
    : 'from-gray-50 to-gray-100';

  return (
    <div className={`bg-gradient-to-r ${bgGradient} border-2 ${borderColor} rounded-xl p-5 sm:p-6 transition-all`}>
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        {/* Left: Status Info */}
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              status === 'connected' ? `bg-${getHealthColor()}-500 text-white` : 'bg-gray-300 text-gray-600'
            }`}>
              {integrationIcons[type]}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg">
                {integrationNames[type]}
              </h3>
              <div className="mt-1">
                {getHealthBadge()}
              </div>
            </div>
          </div>

          {/* Connection Details */}
          {status === 'connected' && metrics && (
            <div className="space-y-2 text-sm">
              {type === 'whatsapp' && metrics.phoneNumber && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 font-medium">📞 Phone:</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">
                    {metrics.phoneNumber}
                  </span>
                </div>
              )}

              {type === 'shopify' && metrics.shopDomain && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 font-medium">🏪 Store:</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">
                    {metrics.shopDomain}
                  </span>
                </div>
              )}

              {metrics.lastSync && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 font-medium">🔄 Last sync:</span>
                  <span className="text-gray-700">{formatLastSync(metrics.lastSync)}</span>
                </div>
              )}

              {/* Token Expiry Warning */}
              {tokenWarning && (
                <div className={`mt-3 p-3 rounded-lg border-2 ${
                  tokenWarning.color === 'red' 
                    ? 'bg-red-50 border-red-300 text-red-800'
                    : 'bg-yellow-50 border-yellow-300 text-yellow-800'
                }`}>
                  <p className="text-sm font-medium">{tokenWarning.message}</p>
                </div>
              )}

              {/* Health Error */}
              {metrics.healthError && (
                <div className="mt-3 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                  <p className="text-sm font-medium text-red-900">
                    ⚠️ {metrics.healthError}
                  </p>
                </div>
              )}
            </div>
          )}

          {status === 'disconnected' && (
            <p className="text-sm text-gray-600">
              Not connected. Click "Connect {integrationNames[type]}" below to set up.
            </p>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col gap-2 min-w-[140px]">
          {status === 'connected' ? (
            <>
              {onTest && (
                <button
                  onClick={onTest}
                  className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
                >
                  🧪 Test Connection
                </button>
              )}
              {onReconnect && (
                <button
                  onClick={onReconnect}
                  className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors border border-gray-300"
                >
                  🔄 Reconnect
                </button>
              )}
              {onDisconnect && (
                <button
                  onClick={onDisconnect}
                  className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors border border-red-200"
                >
                  ✕ Disconnect
                </button>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
