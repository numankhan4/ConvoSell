import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: 0,
    priceYearly: 0,
    description: 'Perfect for testing and small businesses',
    features: [
      'WhatsApp session messages only',
      'Manual order verification',
      '100 contacts',
      'Basic automation',
      'Email support',
    ],
    limitations: [
      'No template messages',
      'Limited to active conversations only',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Starter',
    price: 2999,
    priceYearly: 29990,
    badge: 'Most Popular',
    description: 'For growing businesses ready to automate',
    features: [
      '50 template messages/month',
      'Auto order confirmations',
      '1,000 contacts',
      'Advanced automation',
      'Priority email support',
      'Analytics dashboard',
      'WhatsApp Business API',
    ],
    estimatedCost: 'PKR ~175/mo API costs',
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Pro',
    price: 6999,
    priceYearly: 69990,
    description: 'For established businesses scaling up',
    features: [
      '200 template messages/month',
      'All Starter features',
      '5,000 contacts',
      'Custom message templates',
      'Phone + email support',
      'Advanced analytics',
      'Shopify integration',
      'Multi-store support',
    ],
    estimatedCost: 'PKR ~700/mo API costs',
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Business',
    price: 14999,
    priceYearly: 149990,
    description: 'For large teams with high volume',
    features: [
      '1,000 template messages/month',
      'All Pro features',
      '25,000 contacts',
      'Unlimited automations',
      'Dedicated account manager',
      'White-label options',
      'API access',
      'Priority phone support',
    ],
    estimatedCost: 'PKR ~3,500/mo API costs',
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Enterprise',
    price: null,
    priceYearly: null,
    description: 'Custom solutions for large enterprises',
    features: [
      'Unlimited template messages',
      'Unlimited contacts & members',
      'Custom integrations',
      'Dedicated infrastructure',
      'SLA guarantee',
      '24/7 priority support',
      'Custom contract terms',
      'Volume discounts',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Choose the plan that fits your business. All plans include 14-day free trial, no credit card required.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-blue-900">
              <strong>💡 WhatsApp API costs:</strong> PKR 5-12 per template message (paid directly to Meta)
            </span>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl shadow-sm border-2 transition-all hover:shadow-xl ${
                plan.popular
                  ? 'border-blue-500 scale-105'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-semibold rounded-full shadow-lg">
                  {plan.badge}
                </div>
              )}

              <div className="p-6">
                {/* Plan Header */}
                <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                <p className="text-sm text-slate-600 mb-6 min-h-[40px]">{plan.description}</p>

                {/* Pricing */}
                <div className="mb-6">
                  {plan.price === null ? (
                    <div>
                      <div className="text-3xl font-bold text-slate-900">Custom</div>
                      <div className="text-sm text-slate-500 mt-1">Contact us for pricing</div>
                    </div>
                  ) : plan.price === 0 ? (
                    <div>
                      <div className="text-3xl font-bold text-slate-900">Free</div>
                      <div className="text-sm text-slate-500 mt-1">Forever</div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-slate-900">PKR {plan.price.toLocaleString()}</span>
                        <span className="text-slate-500">/mo</span>
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        PKR {plan.priceYearly.toLocaleString()}/yr <span className="text-green-600 font-medium">(Save PKR {((plan.price * 12) - plan.priceYearly).toLocaleString()})</span>
                      </div>
                      {plan.estimatedCost && (
                        <div className="text-xs text-blue-600 mt-2 font-medium">+ {plan.estimatedCost}</div>
                      )}
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <Link
                  href={plan.name === 'Enterprise' ? '/contact-sales' : '/signup'}
                  className={`block w-full text-center px-4 py-3 rounded-lg font-semibold transition-all mb-6 ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                      : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {plan.cta}
                </Link>

                {/* Features */}
                <div className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-slate-700">{feature}</span>
                    </div>
                  ))}
                  {plan.limitations?.map((limitation, idx) => (
                    <div key={`limit-${idx}`} className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-sm text-slate-500">{limitation}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6 bg-white rounded-lg border border-slate-200 p-8">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">What are WhatsApp API costs?</h3>
              <p className="text-slate-600 text-sm">
                WhatsApp charges PKR 5-12 per template message (business-initiated). Session messages (customer-initiated, within 24h) are free. These costs are separate from ConvoSell subscription and paid directly through Meta.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">What happens when I hit my quota?</h3>
              <p className="text-slate-600 text-sm">
                You can still receive and respond to customer messages (session messages). Template messages will be paused until next month or you can upgrade to a higher plan instantly.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Can I change plans anytime?</h3>
              <p className="text-slate-600 text-sm">
                Yes! You can upgrade or downgrade anytime. Upgrades are instant. Downgrades take effect at the end of your billing cycle.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Is there a setup fee?</h3>
              <p className="text-slate-600 text-sm">
                No setup fees. All plans come with free onboarding support to help you get started with WhatsApp Business API and Shopify integration.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Footer */}
        <div className="text-center mt-16 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to reduce fake orders by 70%?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of Pakistani e-commerce stores automating order verification with WhatsApp
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl"
            >
              Start Free Trial
            </Link>
            <Link
              href="/demo"
              className="px-8 py-4 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition-all border-2 border-blue-400"
            >
              Watch Demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
