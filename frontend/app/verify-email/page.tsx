'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams?.get('token');

    if (!token) {
      setVerifying(false);
      setErrorMessage('Verification token is missing.');
      return;
    }

    const verify = async () => {
      try {
        const response = await axios.post(`${API_URL}/auth/verify-email`, { token });
        setVerified(true);
        toast.success(response.data?.message || 'Email verified successfully.');
      } catch (error: any) {
        setErrorMessage(error.response?.data?.message || 'Unable to verify email.');
      } finally {
        setVerifying(false);
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto mt-8 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:mt-16 sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Email verification</h1>

        {verifying && <p className="mt-3 text-sm text-slate-600">Verifying your email, please wait...</p>}

        {!verifying && verified && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Your email has been verified. You can now sign in.
          </div>
        )}

        {!verifying && !verified && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {errorMessage || 'Verification failed.'}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-600"
          >
            Go to login
          </button>
          <Link
            href="/register"
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to signup
          </Link>
        </div>
      </div>
    </div>
  );
}