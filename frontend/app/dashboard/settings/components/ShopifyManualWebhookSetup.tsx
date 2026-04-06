import { useState } from 'react';
import toast from 'react-hot-toast';

interface ShopifyManualWebhookSetupProps {
  webhookEndpoint: string;
}

export function ShopifyManualWebhookSetup({ webhookEndpoint }: ShopifyManualWebhookSetupProps) {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="mt-4 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-blue-900 text-base">Manual Webhook Setup</h4>
            <p className="text-xs text-blue-700">Required for order sync and automation triggers</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-all"
        >
          {showGuide ? 'Hide Guide' : 'View Guide'}
        </button>
      </div>

      {!showGuide && (
        <p className="text-sm text-blue-800">
          Configure Shopify webhooks once, then they continue working until your public URL changes.
        </p>
      )}

      {showGuide && (
        <div className="space-y-3 mt-4">
          <div className="bg-white border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-900 mb-2">Webhook Endpoint</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-slate-50 border border-blue-200 rounded px-2 py-1.5 font-mono break-all text-blue-900">
                {webhookEndpoint}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(webhookEndpoint);
                  toast.success('Shopify webhook endpoint copied!');
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md font-medium"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="bg-white border border-amber-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-amber-900 mb-3">Setup Steps</p>
            <ol className="space-y-2 text-xs text-amber-900 list-decimal ml-4">
              <li>Open Shopify Admin, then go to Settings, Notifications, and Webhooks.</li>
              <li>Create a webhook with format JSON and the latest stable API version.</li>
              <li>Paste the endpoint above for each webhook topic.</li>
              <li>Create these topics: orders/create, orders/updated, orders/cancelled.</li>
              <li>Save and send a test webhook from Shopify to confirm delivery.</li>
            </ol>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-800">
              One-time setup: you only need to repeat this if your domain or webhook URL changes.
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-xs text-purple-800 font-semibold mb-1">Worker Service Requirement</p>
            <p className="text-xs text-purple-700 mb-2">
              Order webhooks sync data, but automated WhatsApp flows require the worker service to be running.
            </p>
            <code className="text-xs bg-purple-100 px-2 py-1 rounded block font-mono mb-2">cd worker ; npm run start:dev</code>
            <p className="text-xs text-purple-700">
              Without the worker, orders appear in CRM but follow-up automations will not run.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
