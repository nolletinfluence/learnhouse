'use client'

import React, { useEffect, useState } from 'react'
import i18n, { changeLanguage, detectPreferredLocale } from '../../lib/i18n'

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const [, setLang] = useState(i18n.language)

  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      setLang(lng)
    }
    i18n.on('languageChanged', handleLanguageChanged)
    void changeLanguage(detectPreferredLocale())

    return () => {
      i18n.off('languageChanged', handleLanguageChanged)
    }
  }, [])

  return <>{children}</>
}
