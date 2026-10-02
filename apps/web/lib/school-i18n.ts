'use client'

import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

export function useSchoolTranslation() {
  const { t, i18n } = useTranslation('school')
  const translate = useCallback((text: string, values?: Record<string, string | number>) =>
    t(text, { keySeparator: false, ...values }), [t])
  return { t: translate, i18n }
}
