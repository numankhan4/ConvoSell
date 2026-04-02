import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/components/AuthProvider'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WhatsApp CRM - E commerce Operating System',
  description: 'Manage your WhatsApp orders and customer communication',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 5000,
            style: {
              background: '#fff',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              padding: '16px',
              borderRadius: '12px',
              fontSize: '14px',
              maxWidth: '500px',
            },
            success: {
              iconTheme: {
                primary: '#25D366',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
              duration: 7000,
            },
          }}
        />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
