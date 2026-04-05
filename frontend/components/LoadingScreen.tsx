'use client';

import Image from 'next/image';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-white via-primary-50 to-white flex items-center justify-center z-50">
      {/* Background blobs */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      {/* Content */}
      <div className="relative text-center">
        <div className="mb-8">
          <Image
            src="/branding/logo/logo-animated-icon-loop.svg"
            alt="ConvoSell Loading"
            width={120}
            height={120}
            className="w-32 h-32 mx-auto animate-bounce"
            priority
          />
        </div>
        <p className="text-slate-600 font-medium">Loading ConvoSell...</p>
      </div>

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
      `}</style>
    </div>
  );
}
