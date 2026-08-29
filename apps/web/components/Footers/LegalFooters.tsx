'use client'
import React from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import {
  BESTDEVS_LMS_NAME,
  resolveBestDevsPrivacyUrl,
  resolveBestDevsTermsUrl,
} from '@lib/bestdevs-brand'

function LegalLink({ href, className, children }: React.PropsWithChildren<{ href: string; className: string }>) {
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </Link>
  )
}

export function AuthFooter({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const termsUrl = resolveBestDevsTermsUrl()
  const privacyUrl = resolveBestDevsPrivacyUrl()

  if (!termsUrl || !privacyUrl) return null

  return (
    <div className={`pb-8 pt-6 text-center px-6 ${className}`}>
      <p className="text-[13px] text-black/30 font-medium">
        {t('auth.terms_text', { defaultValue: `By continuing, you agree to ${BESTDEVS_LMS_NAME}'s` })}{' '}
        <LegalLink
          href={termsUrl}
          className="text-black/50 hover:text-black/70 transition-colors"
        >
          {t('auth.terms_of_service', { defaultValue: 'Terms of Service' })}
        </LegalLink>{' '}
        {t('auth.and', { defaultValue: 'and' })}{' '}
        <LegalLink
          href={privacyUrl}
          className="text-black/50 hover:text-black/70 transition-colors"
        >
          {t('auth.privacy_policy', { defaultValue: 'Privacy Policy' })}
        </LegalLink>
        .
      </p>
    </div>
  )
}

export function CopyrightFooter({
  year,
  className = '',
  tone = 'light',
}: {
  year: number
  className?: string
  tone?: 'light' | 'dark'
}) {
  const { t } = useTranslation()
  const base = tone === 'dark' ? 'text-white/40' : 'text-black/35'
  const link = tone === 'dark' ? 'text-white/60 hover:text-white/80' : 'text-black/55 hover:text-black/75'
  const termsUrl = resolveBestDevsTermsUrl()
  const privacyUrl = resolveBestDevsPrivacyUrl()
  return (
    <footer className={`w-full py-6 px-6 ${className}`}>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-x-5 gap-y-2 text-[13px] font-medium">
        <p className={base}>
          {t('common.copyright', { defaultValue: `© {{year}} ${BESTDEVS_LMS_NAME}`, year })}
        </p>
        {(termsUrl || privacyUrl) && (
          <nav className="flex items-center gap-x-5">
            {termsUrl && (
              <LegalLink href={termsUrl} className={`${link} transition-colors`}>
                {t('auth.terms_of_service', { defaultValue: 'Terms of Service' })}
              </LegalLink>
            )}
            {privacyUrl && (
              <LegalLink href={privacyUrl} className={`${link} transition-colors`}>
                {t('auth.privacy_policy', { defaultValue: 'Privacy Policy' })}
              </LegalLink>
            )}
          </nav>
        )}
      </div>
    </footer>
  )
}
