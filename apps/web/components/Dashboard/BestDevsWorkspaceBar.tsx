'use client'

import { ArrowSquareOut, House, Wrench } from '@phosphor-icons/react'

import {
  resolveBestDevsAdminUrl,
  resolveBestDevsLandingUrl,
} from '@/lib/bestdevs-brand'

const adminUrl = resolveBestDevsAdminUrl()
const landingUrl = resolveBestDevsLandingUrl()

export default function BestDevsWorkspaceBar() {
  return (
    <header className="bestdevs-workspace-bar">
      <div className="bestdevs-workspace-bar__brand">
        <span>BD</span>
        <div>
          <strong>BestDevs Learning Workshop</strong>
          <small>Учебная платформа</small>
        </div>
      </div>
      <nav aria-label="BestDevs platform links">
        <a href={landingUrl} rel="noreferrer" target="_blank">
          <House aria-hidden="true" size={15} />
          <span>Лендинг</span>
        </a>
        <a href={adminUrl} rel="noreferrer" target="_blank">
          <Wrench aria-hidden="true" size={15} />
          <span>Админка</span>
          <ArrowSquareOut aria-hidden="true" size={13} />
        </a>
      </nav>
    </header>
  )
}
