'use client';

import { useEffect, useState } from 'react';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  errorCode?: number;
}

interface ConnectionTesterProps {
  type: 'whatsapp' | 'shopify';
  credentials: any;
  onTest: (credentials: any) => Promise<TestResult>;
  disabled?: boolean;
}

const PROGRESS_MESSAGES = {
  whatsapp: [
    'Testing access token...',
    'Verifying phone number access...',
    'Checking business account permissions...',
  ],
  shopify: [
    'Validating shop domain...',
    'Testing client credentials...',
    'Exchanging for access token...',
  ],
};

export default function ConnectionTester({
  type,
  credentials,
  onTest,
  disabled,
}: ConnectionTesterProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!isTesting) {
      setMessageIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % PROGRESS_MESSAGES[type].length);
    }, 1500);

    return () => clearInterval(timer);
  }, [isTesting, type]);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const result = await onTest(credentials);
      setTestResult(result);
      
      // Auto-show details if there's an error
      if (!result.success) {
        setShowDetails(true);
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.response?.data?.message || error.message || 'Connection test failed unexpectedly.',
      });
      setShowDetails(true);
    } finally {
      setIsTesting(false);
    }
  };

  const getResultIcon = () => {
    if (isTesting) {
      return (
        <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    }
    
    if (!testResult) return null;
    
    if (testResult.success) {
      return (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
  };

  const getProgressMessage = () => {
    if (!isTesting) return null;

    return (
      <div className="flex items-center gap-2 text-sm text-blue-700">
        <div className="animate-pulse">⏳</div>
        <span>{PROGRESS_MESSAGES[type][messageIndex]}</span>
      </div>
    );
  };

  const canTest = () => {
    if (disabled) return false;
    
    if (type === 'whatsapp') {
      return credentials.phoneNumberId && credentials.businessAccountId && credentials.accessToken;
    } else {
      return credentials.shopDomain && credentials.clientId && credentials.clientSecret;
    }
  };

  return (
    <div className="space-y-3">
      {/* Test Button */}
      <button
        onClick={handleTest}
        disabled={!canTest() || isTesting}
        className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
          canTest() && !isTesting
            ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isTesting ? (
          <>
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Testing Connection...
          </>
        ) : (
          <>
            🧪 Test Connection
          </>
        )}
      </button>

      {/* Progress Messages */}
      {isTesting && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          {getProgressMessage()}
        </div>
      )}

      {/* Test Result */}
      {testResult && !isTesting && (
        <div className={`rounded-lg p-4 border-2 ${
          testResult.success
            ? 'bg-green-50 border-green-300'
            : 'bg-red-50 border-red-300'
        }`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getResultIcon()}
            </div>
            <div className="flex-1 space-y-2">
              <p className={`font-medium text-sm ${
                testResult.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {testResult.message}
              </p>

              {/* Success Details */}
              {testResult.success && testResult.details && (
                <div className="mt-3 space-y-1 text-xs text-green-800">
                  {type === 'whatsapp' && testResult.details.verifiedName && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">✓ Business Name:</span>
                      <span>{testResult.details.verifiedName}</span>
                    </div>
                  )}
                  {type === 'whatsapp' && testResult.details.qualityRating && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">✓ Quality Rating:</span>
                      <span className="uppercase">{testResult.details.qualityRating}</span>
                    </div>
                  )}
                  {type === 'shopify' && testResult.details.scopes && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold">✓ Permissions:</span>
                      <span>{testResult.details.scopes.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Error Details */}
              {!testResult.success && testResult.details && (
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-red-700 hover:text-red-900 font-medium underline"
                >
                  {showDetails ? '▼ Hide technical details' : '▶ Show technical details'}
                </button>
              )}

              {showDetails && testResult.details && !testResult.success && (
                <div className="mt-2 p-3 bg-red-100 rounded border border-red-200">
                  <pre className="text-xs text-red-900 overflow-x-auto">
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                </div>
              )}

              {/* Help Links for Errors */}
              {!testResult.success && (
                <div className="mt-3 pt-3 border-t border-red-200">
                  <p className="text-xs font-semibold text-red-900 mb-2">📖 Need help?</p>
                  <div className="space-y-1 text-xs">
                    {type === 'whatsapp' && (
                      <>
                        <a
                          href="https://business.facebook.com/settings/system-users"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-red-700 hover:text-red-900 underline"
                        >
                          → Generate new access token
                        </a>
                        <a
                          href="https://developers.facebook.com/apps"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-red-700 hover:text-red-900 underline"
                        >
                          → Check WhatsApp app settings
                        </a>
                      </>
                    )}
                    {type === 'shopify' && (
                      <>
                        <a
                          href="https://partners.shopify.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-red-700 hover:text-red-900 underline"
                        >
                          → Verify credentials in Partners portal
                        </a>
                        <a
                          href={`https://${credentials.shopDomain}/admin`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-red-700 hover:text-red-900 underline"
                        >
                          → Open Shopify admin
                        </a>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      {!testResult && !isTesting && (
        <p className="text-xs text-gray-500 text-center">
          💡 Test your credentials before saving to catch errors early
        </p>
      )}
    </div>
  );
}
