'use client'

import React, { useEffect, useState } from 'react'
import i18n, { initializeLanguage } from '../../lib/i18n'

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const [, setLang] = useState(i18n.language)

  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      setLang(lng)
    }
    i18n.on('languageChanged', handleLanguageChanged)
    void initializeLanguage()

    return () => {
      i18n.off('languageChanged', handleLanguageChanged)
    }
  }, [])

  return <>{children}</>
}
