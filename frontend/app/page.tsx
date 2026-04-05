'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/lib/store/auth';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [activeStep, setActiveStep] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'pending' | 'confirmed' | 'rejected'>('idle');

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) return null;

  const simulateVerification = () => {
    setIsVerifying(true);
    setVerificationStatus('pending');
    
    setTimeout(() => {
      setVerificationStatus('confirmed');
      setTimeout(() => {
        setVerificationStatus('idle');
        setIsVerifying(false);
      }, 3000);
    }, 2500);
  };

  return (
    <div className="bg-white text-slate-900">
      {/* ✨ NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="flex items-center justify-between px-6 py-3 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-0">
            <Image 
              src="/branding/logo/logo.svg" 
              alt="ConvoSell" 
              width={220}
              height={55}
              className="w-56 h-auto"
            />
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 transition">
              Login
            </Link>
            <Link 
              href="/register" 
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition transform hover:scale-105"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* 🚀 HERO SECTION - PROFESSIONAL SAAS DESIGN */}
      <section className="relative overflow-hidden bg-white">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/30"></div>
        
        {/* Sophisticated animated elements - very subtle */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-indigo-400/10 to-transparent rounded-full blur-3xl"></div>

        <div className="relative max-w-7xl mx-auto px-6 py-20">
          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* LEFT - TEXT & VALUE PROPS */}
            <div className="z-10">
              {/* Badge - Professional */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-8">
                <span className="flex h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                Enterprise-grade verification
              </div>

              {/* Headline - Clean and powerful */}
              <h1 className="text-6xl lg:text-7xl font-bold leading-tight mb-6 text-slate-900">
                Verify Orders.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  Reduce Risk.
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-lg font-medium">
                Eliminate fake COD orders with instant WhatsApp verification. Trusted by e-commerce leaders to reduce losses and increase delivery success.
              </p>

              {/* Social Proof Stats - Clean */}
              <div className="grid grid-cols-3 gap-6 mb-12">
                <div className="border border-slate-200 rounded-lg p-5 hover:border-blue-300 hover:bg-blue-50/30 transition group bg-white">
                  <p className="text-3xl font-bold text-blue-600 group-hover:text-blue-700">70%</p>
                  <p className="text-sm text-slate-600 mt-2 font-medium">Fake Orders Cut</p>
                </div>
                <div className="border border-slate-200 rounded-lg p-5 hover:border-blue-300 hover:bg-blue-50/30 transition group bg-white">
                  <p className="text-3xl font-bold text-slate-900 group-hover:text-blue-700">2sec</p>
                  <p className="text-sm text-slate-600 mt-2 font-medium">Verify Time</p>
                </div>
                <div className="border border-slate-200 rounded-lg p-5 hover:border-blue-300 hover:bg-blue-50/30 transition group bg-white">
                  <p className="text-3xl font-bold text-slate-900 group-hover:text-blue-700">99%</p>
                  <p className="text-sm text-slate-600 mt-2 font-medium">Uptime SLA</p>
                </div>
              </div>

              {/* CTA Buttons - Professional */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/register" 
                  className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition duration-200 shadow-sm hover:shadow-md"
                >
                  Start Free Trial
                </Link>
                <Link 
                  href="#verification-demo" 
                  className="inline-flex items-center justify-center border-2 border-slate-300 text-slate-700 hover:border-blue-600 hover:text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg transition duration-200"
                >
                  See Demo
                </Link>
              </div>

              {/* Trust text */}
              <p className="text-sm text-slate-500 mt-8 font-medium">
                No credit card required. 30-day free trial.
              </p>
            </div>

            {/* RIGHT - SHOWCASE CARD */}
            <div className="relative z-10">
              {/* Card */}
              <div className="relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition duration-300">
                {/* Top accent gradient */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

                <div className="p-8">
                  {/* Logo Display */}
                  <div className="mb-10 flex justify-center">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <Image 
                        src="/branding/logo/logo-animated-icon-loop.svg" 
                        alt="ConvoSell" 
                        width={160}
                        height={160}
                        className="w-40 h-40"
                        priority
                      />
                    </div>
                  </div>

                  {/* Feature List - Minimal and professional */}
                  <div className="space-y-5 mb-10">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm">Instant Setup</h3>
                        <p className="text-slate-600 text-sm mt-1">Connect WhatsApp in minutes</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm">Real-time Analytics</h3>
                        <p className="text-slate-600 text-sm mt-1">Track verification rates and conversions</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm">Enterprise Security</h3>
                        <p className="text-slate-600 text-sm mt-1">Bank-grade encryption & compliance</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm">24/7 Support</h3>
                        <p className="text-slate-600 text-sm mt-1">Dedicated success team</p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom CTA */}
                  <Link
                    href="#verification-demo"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold text-sm transition border border-blue-200 hover:border-blue-300"
                  >
                    <span>Explore How It Works</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🎯 INTERACTIVE LIVE ORDER VERIFICATION */}
      <section id="verification-demo" className="py-24 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden scroll-mt-20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-500 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              Live Order Verification in Action
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              See how ConvoSell automatically verifies customers and reduces fake orders
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* LEFT - INTERACTIVE DEMO */}
            <div className="space-y-6">
              {/* ORDER CARD */}
              <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-6 border border-slate-600 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center font-bold">
                    MS
                  </div>
                  <div>
                    <p className="font-medium">Mohsin Siddiqui</p>
                    <p className="text-sm text-slate-400">+92 323 456 7890</p>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-lg p-4 mb-4">
                  <p className="text-sm text-slate-400">Order #SKU-12345</p>
                  <p className="text-2xl font-bold mt-1">PKR 5,499</p>
                  <p className="text-sm text-slate-400 mt-2">Nike Shoes × 1</p>
                </div>

                <div className={`text-center py-3 rounded-lg font-medium text-sm transition-all ${
                  verificationStatus === 'idle' ? 'bg-slate-700 text-slate-300' :
                  verificationStatus === 'pending' ? 'bg-amber-900 text-amber-200 animate-pulse' :
                  verificationStatus === 'confirmed' ? 'bg-green-900 text-green-200' :
                  'bg-red-900 text-red-200'
                }`}>
                  {verificationStatus === 'idle' && '⏳ Awaiting Verification'}
                  {verificationStatus === 'pending' && '⌚ Verifying with Customer...'}
                  {verificationStatus === 'confirmed' && '✅ Order Confirmed!'}
                  {verificationStatus === 'rejected' && '❌ Order Rejected'}
                </div>
              </div>

              {/* WHATSAPP CONVERSATION PREVIEW */}
              <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-6 border border-slate-600">
                <p className="text-sm text-slate-400 mb-4">WhatsApp Conversation</p>
                <div className="space-y-3">
                  <div className="bg-primary-600 rounded-lg p-3 text-sm ml-auto max-w-xs">
                    Hi Mohsin! 👋 Your order #SKU-12345 (Nike Shoes - PKR 5,499) is ready. Can you confirm? YES / NO
                  </div>
                  {isVerifying && verificationStatus === 'pending' && (
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce animation-delay-200"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce animation-delay-400"></div>
                    </div>
                  )}
                  {verificationStatus === 'confirmed' && (
                    <div className="bg-green-900 rounded-lg p-3 text-sm max-w-xs text-green-200">
                      YES ✅
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT - BENEFITS */}
            <div className="space-y-6">
              <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-6 hover:border-primary-500 transition">
                <p className="text-3xl mb-3">⚡</p>
                <h3 className="text-lg font-bold mb-2">Instant Verification</h3>
                <p className="text-slate-300">Verify orders in seconds, not hours. Protect your business from day one.</p>
              </div>

              <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-6 hover:border-primary-500 transition">
                <p className="text-3xl mb-3">🎯</p>
                <h3 className="text-lg font-bold mb-2">Reduce Fake Orders</h3>
                <p className="text-slate-300">Cut fake COD orders by up to 70% with automated customer confirmation.</p>
              </div>

              <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-6 hover:border-primary-500 transition">
                <p className="text-3xl mb-3">📈</p>
                <h3 className="text-lg font-bold mb-2">Increase Revenue</h3>
                <p className="text-slate-300">Higher confirmation rates = higher delivery success = more revenue.</p>
              </div>

              <button
                onClick={simulateVerification}
                disabled={isVerifying}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition transform hover:scale-105 mt-6"
              >
                {isVerifying ? 'Verifying...' : 'Try Live Demo'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 📊 METRICS */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-6 sm:grid-cols-2">
            <div className="bg-white rounded-xl p-6 border border-slate-200 text-center">
              <p className="text-4xl font-bold text-primary-600 mb-2">70%</p>
              <p className="text-slate-600 font-medium">Fake Orders Reduced</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200 text-center">
              <p className="text-4xl font-bold text-primary-600 mb-2">2.3x</p>
              <p className="text-slate-600 font-medium">Higher Confirmation</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200 text-center">
              <p className="text-4xl font-bold text-primary-600 mb-2">2sec</p>
              <p className="text-slate-600 font-medium">Avg Response Time</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200 text-center">
              <p className="text-4xl font-bold text-primary-600 mb-2">24/7</p>
              <p className="text-slate-600 font-medium">Automation & Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* 🎯 HOW IT WORKS */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How ConvoSell Works</h2>
            <p className="text-xl text-slate-600">Simple 3-step process to eliminate fake orders</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div 
              onClick={() => setActiveStep(0)}
              className={`cursor-pointer p-8 rounded-2xl border-2 transition transform hover:scale-105 ${
                activeStep === 0 
                  ? 'border-primary-600 bg-primary-50' 
                  : 'border-slate-200 bg-white hover:border-primary-300'
              }`}
            >
              <div className={`text-5xl font-bold mb-4 ${activeStep === 0 ? 'text-primary-600' : 'text-slate-300'}`}>
                1
              </div>
              <h3 className="text-xl font-bold mb-3">Order Created</h3>
              <p className="text-slate-600">Customer places order on Shopify or Facebook Shop. ConvoSell instantly syncs the order.</p>
            </div>

            <div 
              onClick={() => setActiveStep(1)}
              className={`cursor-pointer p-8 rounded-2xl border-2 transition transform hover:scale-105 ${
                activeStep === 1 
                  ? 'border-primary-600 bg-primary-50' 
                  : 'border-slate-200 bg-white hover:border-primary-300'
              }`}
            >
              <div className={`text-5xl font-bold mb-4 ${activeStep === 1 ? 'text-primary-600' : 'text-slate-300'}`}>
                2
              </div>
              <h3 className="text-xl font-bold mb-3">Instant Verification</h3>
              <p className="text-slate-600">Automated WhatsApp message sent to customer asking for confirmation with one-click YES/NO.</p>
            </div>

            <div 
              onClick={() => setActiveStep(2)}
              className={`cursor-pointer p-8 rounded-2xl border-2 transition transform hover:scale-105 ${
                activeStep === 2 
                  ? 'border-primary-600 bg-primary-50' 
                  : 'border-slate-200 bg-white hover:border-primary-300'
              }`}
            >
              <div className={`text-5xl font-bold mb-4 ${activeStep === 2 ? 'text-primary-600' : 'text-slate-300'}`}>
                3
              </div>
              <h3 className="text-xl font-bold mb-3">Deliver with Confidence</h3>
              <p className="text-slate-600">Confirmed orders only. No surprises. Reduce delivery losses and increase revenue.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ✨ FEATURES */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Packed with Powerful Features</h2>
            <p className="text-xl text-slate-600">Everything you need to run a successful order verification system</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '💬', title: 'WhatsApp Integration', desc: 'Connect your WhatsApp Business Account for instant messaging' },
              { icon: '🛍️', title: 'Shopify Sync', desc: 'Automatically sync orders from Shopify in real-time' },
              { icon: '🤖', title: 'Smart Automation', desc: 'Pre-configured automation rules for COD verification' },
              { icon: '📊', title: 'Analytics Dashboard', desc: 'Track verification rates, fake order reduction, and metrics' },
              { icon: '👥', title: 'Team Collaboration', desc: 'Invite team members and manage permissions' },
              { icon: '🔒', title: 'Enterprise Security', desc: 'Bank-level encryption and multi-tenant isolation' },
            ].map((feature, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 hover:border-primary-400 hover:shadow-lg transition">
                <p className="text-4xl mb-4">{feature.icon}</p>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🎁 PRICING SECTION */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-slate-600">Grow without limits. No hidden fees.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="border-2 border-slate-200 rounded-2xl p-8 hover:border-primary-400 transition">
              <h3 className="text-2xl font-bold mb-2">Starter</h3>
              <p className="text-slate-600 mb-6">Perfect for getting started</p>
              <p className="text-4xl font-bold mb-1">Free</p>
              <p className="text-sm text-slate-600 mb-6">Forever</p>
              <ul className="space-y-3 text-sm mb-8">
                <li className="flex items-center gap-2">✅ <span>Up to 100 orders/month</span></li>
                <li className="flex items-center gap-2">✅ <span>WhatsApp verification</span></li>
                <li className="flex items-center gap-2">✅ <span>Basic analytics</span></li>
              </ul>
              <Link href="/register" className="w-full block text-center border-2 border-primary-600 text-primary-600 py-3 rounded-lg font-medium hover:bg-primary-50 transition">
                Get Started
              </Link>
            </div>

            <div className="border-2 border-primary-600 rounded-2xl p-8 bg-primary-50 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold mb-2">Professional</h3>
              <p className="text-slate-600 mb-6">For growing businesses</p>
              <p className="text-4xl font-bold mb-1">PKR 4,999</p>
              <p className="text-sm text-slate-600 mb-6">per month</p>
              <ul className="space-y-3 text-sm mb-8">
                <li className="flex items-center gap-2">✅ <span>Unlimited orders</span></li>
                <li className="flex items-center gap-2">✅ <span>Priority support</span></li>
                <li className="flex items-center gap-2">✅ <span>Advanced analytics</span></li>
                <li className="flex items-center gap-2">✅ <span>Team collaboration</span></li>
              </ul>
              <Link href="/register" className="w-full block text-center bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition">
                Start Free Trial
              </Link>
            </div>

            <div className="border-2 border-slate-200 rounded-2xl p-8 hover:border-primary-400 transition">
              <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
              <p className="text-slate-600 mb-6">For large teams</p>
              <p className="text-4xl font-bold mb-1">Custom</p>
              <p className="text-sm text-slate-600 mb-6">Contact us</p>
              <ul className="space-y-3 text-sm mb-8">
                <li className="flex items-center gap-2">✅ <span>Everything in Pro</span></li>
                <li className="flex items-center gap-2">✅ <span>Custom integration</span></li>
                <li className="flex items-center gap-2">✅ <span>Dedicated support</span></li>
                <li className="flex items-center gap-2">✅ <span>SLA guarantee</span></li>
              </ul>
              <button className="w-full text-center border-2 border-primary-600 text-primary-600 py-3 rounded-lg font-medium hover:bg-primary-50 transition">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 🚀 FINAL CTA */}
      <section className="py-24 bg-gradient-to-r from-primary-600 to-primary-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white rounded-full"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-bold mb-6">
            Ready to Eliminate Fake Orders?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of e-commerce sellers already using ConvoSell to reduce fake orders and increase delivery success.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/register" 
              className="inline-flex items-center justify-center bg-white text-primary-600 hover:bg-slate-100 px-8 py-4 rounded-lg font-bold text-lg transition transform hover:scale-105"
            >
              Start Free Trial Now
            </Link>
            <Link 
              href="/login" 
              className="inline-flex items-center justify-center border-2 border-white text-white hover:bg-white/10 px-8 py-4 rounded-lg font-bold text-lg transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* 📱 FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-bold mb-4">ConvoSell</h4>
              <p className="text-sm">Turn WhatsApp chats into confirmed orders.</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm">
            <p>© 2026 ConvoSell. All rights reserved. Built with ❤️ for Pakistani e-commerce.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .animation-delay-200 {
          animation-delay: 200ms;
        }
        
        .animation-delay-400 {
          animation-delay: 400ms;
        }
      `}</style>
    </div>
  );
}