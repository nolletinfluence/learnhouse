import Link from 'next/link'
import React from 'react'
import { useOrg } from '../Contexts/OrgContext'
import { useTranslation } from 'react-i18next'
import { usePlan } from '@components/Hooks/usePlan'
import { getDeploymentMode } from '@services/config/config'
import { BestDevsLogo } from '@components/Brand/BestDevsLogo'
import { resolveBestDevsLandingUrl } from '@lib/bestdevs-brand'

function Watermark() {
    const { t } = useTranslation()
    const org = useOrg() as any

    const mode = getDeploymentMode()
    const plan = usePlan()
    const watermarkConfig = org?.config?.config?.customization?.general?.watermark ?? org?.config?.config?.general?.watermark

    // Visibility rules, in priority order:
    //   1. EE         → always hidden (white-label is part of the EE license).
    //   2. SaaS free  → always shown (free tier is branded).
    //   3. Otherwise  → respect the admin's toggle (default on).
    if (mode === 'ee') return null
    const showWatermark = plan === 'free' || watermarkConfig !== false
    if (!showWatermark) return null

    return (
        <div className='fixed bottom-8 end-8 z-50'>
            <Link href={resolveBestDevsLandingUrl()} className="flex items-center cursor-pointer bg-white/80 backdrop-blur-lg text-gray-700 rounded-2xl p-2 light-shadow text-xs px-5 font-semibold space-x-2">
                <p>{t('common.made_with')}</p>
                <BestDevsLogo
                    showName
                    className="h-5 w-5 rounded"
                    wrapperClassName="flex items-center gap-1.5"
                    nameClassName="font-bold"
                />
            </Link>
        </div>
    )
}

export default Watermark
