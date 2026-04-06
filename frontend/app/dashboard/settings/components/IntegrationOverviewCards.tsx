interface IntegrationOverviewCardsProps {
  whatsappConnected: boolean;
  shopifyConnected: boolean;
}

export function IntegrationOverviewCards({ whatsappConnected, shopifyConnected }: IntegrationOverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">WhatsApp</p>
            <p className="text-base font-semibold text-slate-900 mt-1">Business Messaging</p>
            <p className="text-xs text-slate-600 mt-1">Incoming/outgoing messages and inbox sync</p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              whatsappConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {whatsappConnected ? 'Connected' : 'Not Connected'}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">Shopify</p>
            <p className="text-base font-semibold text-slate-900 mt-1">Orders and Customers</p>
            <p className="text-xs text-slate-600 mt-1">Store connection and order automation source</p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              shopifyConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {shopifyConnected ? 'Connected' : 'Not Connected'}
          </span>
        </div>
      </div>
    </div>
  );
}
