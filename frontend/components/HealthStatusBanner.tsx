'use client';

import { useEffect, useState } from 'react';
import { healthApi } from '@/lib/api';
import Link from 'next/link';

interface HealthStatus {
  whatsapp: {
    connected: boolean;
    status: string;
    error?: string;
    expiresIn?: number;
  };
}

export default function HealthStatusBanner() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Delay initial health check by 2 seconds to not block page load
    const initialCheckTimeout = setTimeout(() => {
      checkHealth();
    }, 2000);

    // Check health every 5 minutes
    const interval = setInterval(checkHealth, 5 * 60 * 1000);
    
    return () => {
      clearTimeout(initialCheckTimeout);
      clearInterval(interval);
    };
  }, []);

  const checkHealth = async () => {
    try {
      // Add a 5-second timeout to prevent blocking UI
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await healthApi.getWorkspaceHealth();
      clearTimeout(timeoutId);
      
      setHealth(response.data);
    } catch (error: any) {
      // Silently fail - don't show banner if health check fails
      if (error.name === 'AbortError') {
        console.log('Health check timed out - skipping banner');
      } else {
        console.error('Failed to load health status:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render anything while loading (prevents blocking)
  if (isLoading || !health || !health.whatsapp.connected || dismissed) {
    return null;
  }

  const { status, error, expiresIn } = health.whatsapp;

  // Only show banner for warning or error status
  if (status === 'healthy') {
    return null;
  }

  const isError = status === 'error';
  const bgColor = isError ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
  const textColor = isError ? 'text-red-800' : 'text-amber-800';
  const iconColor = isError ? 'text-red-500' : 'text-amber-500';
  const buttonColor = isError ? 'hover:bg-red-100' : 'hover:bg-amber-100';

  let message = error || 'WhatsApp integration needs attention';
  if (expiresIn !== undefined && expiresIn > 0) {
    message = `WhatsApp access token expires in ${expiresIn} day${expiresIn !== 1 ? 's' : ''}`;
  }

  return (
    <div className={`border-b ${bgColor} ${textColor} px-4 py-3 relative`}>
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <svg
            className={`w-5 h-5 ${iconColor} flex-shrink-0`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isError ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            )}
          </svg>
          <div>
            <p className="font-medium">{message}</p>
            {isError && (
              <p className="text-sm mt-0.5">
                {expiresIn !== undefined && expiresIn < 0
                  ? `Token expired ${Math.abs(expiresIn)} day${Math.abs(expiresIn) !== 1 ? 's' : ''} ago. `
                  : ''}
                Automations and messaging are currently not working.
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/settings"
            className={`px-4 py-1.5 ${bgColor} ${textColor} ${buttonColor} rounded-lg text-sm font-medium transition-colors border ${isError ? 'border-red-300' : 'border-amber-300'}`}
          >
            Update Token
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className={`p-1 ${buttonColor} rounded transition-colors`}
            aria-label="Dismiss"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
