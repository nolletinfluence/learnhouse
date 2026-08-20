import '../styles/globals.css'
import React from 'react'
import Providers from '@components/Providers'
import { Onest, Tajawal } from 'next/font/google'
import Script from 'next/script'

const onest = Onest({
  subsets: ['cyrillic', 'latin'],
  display: 'swap',
  variable: '--font-default',
})

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '700', '800'],
  display: 'swap',
  variable: '--font-arabic',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      className={`${onest.variable} ${tajawal.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <Script src="/dir-init.js" strategy="beforeInteractive" />
        <Script src="/runtime-config.js" strategy="beforeInteractive" />
        <Script src="/embed-bg.js" strategy="beforeInteractive" />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <main className="animate-fade-in">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
