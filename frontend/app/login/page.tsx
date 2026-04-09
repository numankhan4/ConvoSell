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

    <Link href="/" className="inline-block mb-8" aria-label="Go to landing page">
      <img
        src="/branding/logo/logo.svg"
        alt="ConvoSell logo"
        className="h-16 w-auto"
      />
    </Link>

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
          <div className="hidden lg:flex justify-center mb-6">
            <Link href="/" aria-label="Go to landing page">
              <img
                src="/branding/logo/logo.svg"
                alt="ConvoSell logo"
                className="h-12 w-auto"
              />
            </Link>
          </div>

          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6 sm:mb-8">
            <Link href="/" className="inline-flex flex-col items-center" aria-label="Go to landing page">
              <img
                src="/branding/logo/logo.svg"
                alt="ConvoSell logo"
                className="h-12 sm:h-14 w-auto"
              />
            </Link>
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
