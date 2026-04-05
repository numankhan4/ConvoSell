import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/components/AuthProvider'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ConvoSell – Revenue Automation & Order Verification Platform',
  description: 'Turn conversations into revenue with intelligent automation, order verification, and real-time customer engagement. Reduce fake COD orders and increase delivery success with ConvoSell.',
  icons: {
    icon: [
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '96x96',
        url: '/favicon-96x96.png',
      },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        url: '/favicon.svg',
      },
      {
        rel: 'shortcut icon',
        url: '/favicon.ico',
      },
    ],
    apple: [
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        url: '/apple-touch-icon.png',
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ConvoSell',
  },
  manifest: '/site.webmanifest',
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
