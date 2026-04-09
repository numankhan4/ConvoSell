'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth';
import toast from 'react-hot-toast';
import { validateStrongPassword } from '@/lib/utils/password';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isInitialized } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    workspaceName: '',
  });
  const [loading, setLoading] = useState(false);
  const [devVerificationToken, setDevVerificationToken] = useState<string | null>(null);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [verificationPendingEmail, setVerificationPendingEmail] = useState<string>('');
  const passwordValidation = validateStrongPassword(formData.password);

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

    if (!passwordValidation.isValid) {
      toast.error('Please choose a stronger password that meets all requirements.');
      return;
    }

    setLoading(true);

    try {
      const response = await register(formData);
      const signupEmail = formData.email.trim().toLowerCase();

      if (response?.verificationToken) {
        setDevVerificationToken(response.verificationToken);
      }

      setVerificationPendingEmail(signupEmail);
      toast.success(response?.message || 'Account created. Please verify your email before signing in.');
      setFormData((prev) => ({ ...prev, password: '' }));
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const targetEmail = verificationPendingEmail || formData.email.trim().toLowerCase();
    if (!targetEmail) {
      toast.error('Enter your email first.');
      return;
    }

    setResendingVerification(true);
    try {
      const response = await axios.post(`${API_URL}/auth/resend-verification`, {
        email: targetEmail,
      });

      if (response.data?.verificationToken) {
        setDevVerificationToken(response.data.verificationToken);
      }

      setVerificationPendingEmail(targetEmail);
      setResendCooldownSeconds(60);
      toast.success(response.data?.message || 'Verification email sent.');
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

  const handleDevVerifyEmail = async () => {
    if (!devVerificationToken) return;

    setVerifyingEmail(true);
    try {
      const response = await axios.post(`${API_URL}/auth/verify-email`, {
        token: devVerificationToken,
      });
      toast.success(response.data?.message || 'Email verified. Please sign in.');
      router.push('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to verify email.');
    } finally {
      setVerifyingEmail(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Left Side - Premium SaaS Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-700 to-primary-900 items-center justify-center p-10 relative overflow-hidden">

        {/* Subtle light gradient (clean, not blobs) */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_40%)]"></div>

        <div className="relative z-10 text-white max-w-lg w-full">

          {/* 🔥 Animated Logo */}
          <div className="mb-8">
            <div className="w-16 h-16">
              {/* paste your animated SVG here */}
            </div>
          </div>

          {/* 🔥 HEADLINE (IMPORTANT CHANGE) */}
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Start Recovering Revenue
            <span className="block text-primary-200">
              from Day One
            </span>
          </h1>

          <p className="text-lg text-primary-100 mb-8">
            Verify customers, confirm orders, and reduce fake COD losses with intelligent automation.
          </p>

          {/* 🔥 PRODUCT PREVIEW (BIG UPGRADE) */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-5 mb-8 shadow-xl">

            <div className="text-sm text-primary-200 mb-3">
              Live Order Confirmation
            </div>

            <div className="bg-slate-900 rounded-lg p-4 text-sm space-y-2">
              <div className="text-green-400">✔ Order Confirmed</div>
              <div className="text-slate-400">Customer replied: YES</div>
              <div className="text-slate-500 text-xs">Response time: 2 sec</div>
            </div>

          </div>

          {/* 🔥 TRUST METRICS (CRITICAL) */}
          <div className="grid grid-cols-3 gap-4 text-center">

            <div>
              <div className="text-xl font-bold">70%</div>
              <div className="text-xs text-primary-200">Fake Orders Reduced</div>
            </div>

            <div>
              <div className="text-xl font-bold">2x</div>
              <div className="text-xs text-primary-200">Higher Confirmation</div>
            </div>

            <div>
              <div className="text-xl font-bold">24/7</div>
              <div className="text-xs text-primary-200">Automation</div>
            </div>

          </div>

        </div>
      </div>

      {/* Right Side - Registration Form */}
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

          {/* Registration Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 animate-slide-up">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Create your account</h2>
              <p className="text-sm sm:text-base text-slate-600">Start converting conversations into sales</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    className="w-full min-h-[44px] px-3 sm:px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    className="w-full min-h-[44px] px-3 sm:px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={12}
                  className="w-full min-h-[44px] px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <div className="mt-2 space-y-1">
                  {passwordValidation.rules.map((rule) => (
                    <p
                      key={rule.label}
                      className={`text-xs ${rule.passed ? 'text-emerald-600' : 'text-slate-500'}`}
                    >
                      {rule.passed ? '✓' : '•'} {rule.label}
                    </p>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="workspaceName" className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                  Workspace Name
                </label>
                <input
                  id="workspaceName"
                  type="text"
                  value={formData.workspaceName}
                  onChange={(e) => setFormData({ ...formData, workspaceName: e.target.value })}
                  required
                  placeholder="My Store"
                  className="w-full min-h-[44px] px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-slate-500 mt-1">This will be your workspace identifier</p>
              </div>

              <button
                type="submit"
                disabled={loading || !passwordValidation.isValid}
                className="w-full min-h-[44px] bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow-md text-sm sm:text-base"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </button>
            </form>

            <div className="mt-6 sm:mt-8 text-center">
              <p className="text-sm text-slate-600">
                Already have an account?{' '}
                <Link 
                  href="/login" 
                  className="font-medium text-primary-600 hover:text-primary-700 transition-colors"
                >
                  Sign in
                </Link>
              </p>
              {verificationPendingEmail && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendingVerification || resendCooldownSeconds > 0}
                  className="mt-3 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendingVerification
                    ? 'Resending verification...'
                    : resendCooldownSeconds > 0
                      ? `Resend available in ${resendCooldownSeconds}s`
                      : "Didn't receive email? Resend verification"}
                </button>
              )}
              {devVerificationToken && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left">
                  <p className="text-xs font-semibold text-amber-800">Development Mode</p>
                  <p className="mt-1 text-xs text-amber-700 break-all">Verification token: {devVerificationToken}</p>
                  <button
                    type="button"
                    onClick={handleDevVerifyEmail}
                    disabled={verifyingEmail}
                    className="mt-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {verifyingEmail ? 'Verifying...' : 'Verify Email Now'}
                  </button>
                </div>
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
