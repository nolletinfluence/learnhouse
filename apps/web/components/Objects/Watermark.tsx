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

    //   1. EE         → always hidden (white-label is part of the EE license).

    if (mode === 'ee') return null
    const showWatermark = plan === 'free' || watermarkConfig !== false
    if (!showWatermark) return null

    return (
        <div className="flex justify-center px-4 pt-6 pb-28 sm:pb-6">
            <Link href={resolveBestDevsLandingUrl()} className="inline-flex flex-wrap justify-center items-center gap-2 text-gray-500 text-xs font-semibold">
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
