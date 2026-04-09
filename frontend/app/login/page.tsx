'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isInitialized } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastLoginError, setLastLoginError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendingVerification, setResendingVerification] = useState(false);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);

  const isUnverifiedEmailError = (message: string) =>
    /verify your email|not verified|unverified/i.test(message || '');

  // Redirect if already authenticated
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isInitialized, router]);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setResendCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldownSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLastLoginError('');
    setUnverifiedEmail('');

    try {
      await login(email, password);
      toast.success('Welcome back! 👋');
      router.push('/dashboard');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || 'Login failed. Please check your credentials.';
      setLastLoginError(errorMessage);
      if (isUnverifiedEmailError(errorMessage)) {
        setUnverifiedEmail(email.trim().toLowerCase());
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const targetEmail = unverifiedEmail || email.trim().toLowerCase();
    if (!targetEmail) {
      toast.error('Enter your email first to resend verification.');
      return;
    }

    setResendingVerification(true);
    try {
      const response = await axios.post(`${API_URL}/auth/resend-verification`, {
        email: targetEmail,
      });

      const tokenNote = response.data?.verificationToken
        ? ` Dev token: ${response.data.verificationToken}`
        : '';
      setResendCooldownSeconds(60);
      toast.success(`${response.data?.message || 'Verification email sent.'}${tokenNote}`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to resend verification email.';
      const cooldownMatch = errorMessage.match(/(\d+)\s*seconds/i);
      if (cooldownMatch?.[1]) {
        setResendCooldownSeconds(Number(cooldownMatch[1]));
      }
      toast.error(errorMessage);
    } finally {
      setResendingVerification(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50">
      {/* Left Side - Branding */}
      {/* Left Side - Premium Branding */}
<div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-700 to-primary-900 items-center justify-center p-10 relative overflow-hidden">

  {/* Subtle gradient glow (not blobs) */}
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_40%)]"></div>

  <div className="relative z-10 text-white max-w-lg w-full">

    {/* 🔥 Animated Logo */}
    <div className="mb-8">
      <div className="w-16 h-16">
        {/* paste your animated SVG here */}
      </div>
    </div>

    {/* Heading */}
    <h1 className="text-4xl font-bold mb-4 leading-tight">
      Stop Losing Revenue
      <span className="block text-primary-200">
        on Fake Orders
      </span>
    </h1>

    <p className="text-lg text-primary-100 mb-8">
      Automatically verify customers, confirm orders, and increase delivery success with ConvoSell.
    </p>

    {/* 🔥 Product Preview Card */}
    <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-5 mb-8 shadow-xl">

      <div className="text-sm text-primary-200 mb-3">Live Order Verification</div>

      <div className="bg-slate-900 rounded-lg p-4 text-sm space-y-2">
        <div className="text-green-400">✔ Order Confirmed</div>
        <div className="text-slate-400">Customer replied: YES</div>
        <div className="text-slate-500 text-xs">2 sec ago</div>
      </div>

    </div>

    {/* 🔥 Trust Signals (VERY IMPORTANT) */}
    <div className="grid grid-cols-3 gap-4 text-center">

      <div>
        <div className="text-xl font-bold">70%</div>
        <div className="text-xs text-primary-200">Fake Orders Reduced</div>
      </div>

      <div>
        <div className="text-xl font-bold">2x</div>
        <div className="text-xs text-primary-200">Higher Confirmations</div>
      </div>

      <div>
        <div className="text-xl font-bold">24/7</div>
        <div className="text-xs text-primary-200">Automation</div>
      </div>

    </div>

  </div>
</div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 xl:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-primary-500 rounded-2xl mb-3 sm:mb-4">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">ConvoSell</h2>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 animate-slide-up">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Welcome back</h2>
              <p className="text-sm sm:text-base text-slate-600">Sign in to continue to your dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full min-h-[44px] px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full min-h-[44px] px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <div className="mt-2 text-right">
                  <Link
                    href="/forgot-password"
                    className="text-xs sm:text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px] bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow-md text-sm sm:text-base"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            <div className="mt-6 sm:mt-8 text-center">
              <p className="text-sm text-slate-600">
                Don't have an account?{' '}
                <Link 
                  href="/register" 
                  className="font-medium text-primary-600 hover:text-primary-700 transition-colors"
                >
                  Create account
                </Link>
              </p>
              {isUnverifiedEmailError(lastLoginError) && unverifiedEmail && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendingVerification || resendCooldownSeconds > 0}
                  className="mt-3 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendingVerification
                    ? 'Sending verification...'
                    : resendCooldownSeconds > 0
                      ? `Resend available in ${resendCooldownSeconds}s`
                      : "Didn't receive email? Resend verification"}
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs sm:text-sm text-slate-500 mt-6 sm:mt-8">
            © 2026 ConvoSell. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
