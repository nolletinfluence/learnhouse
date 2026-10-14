'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { getUriWithOrg } from '@services/config/config'
import { fetchRAGChatSessions, RAGChatSession } from '@services/ai/ai'
import { HeaderProfileBox } from '@components/Security/HeaderProfileBox'
import MenuLinks from './OrgMenuLinks'
import { getOrgLogoMediaDirectory } from '@services/media/media'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'

import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import useAdminStatus from '@components/Hooks/useAdminStatus'
import {
  Question,
  Globe,
  ChatCircleDots,
  ChatCircle,
  SquaresFour,
} from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"
import { FeedbackModal } from '@components/Objects/Modals/FeedbackModal'
import { DASHBOARD_MENU_ITEMS, DashboardMenuItem } from '@/lib/dashboard-menu-items'
import { isFeatureAvailable } from '@services/plans/plans'
import { getMenuColorClasses } from '@services/utils/ts/colorUtils'
import { useJoinBannerVisible, JOIN_BANNER_HEIGHT } from '@components/Objects/Banners/OrgJoinBanner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@components/ui/tooltip'
import { useLHAnalytics, AnalyticsEvent } from '@services/analytics'
import { BestDevsLogo } from '@components/Brand/BestDevsLogo'
import { BESTDEVS_LMS_NAME, resolveBestDevsLandingUrl } from '@lib/bestdevs-brand'

export const OrgMenu = (props: any) => {
  const orgslug = props.orgslug
  const session = useLHSession() as any;
  const _access_token = session?.data?.tokens?.access_token;
  const org = useOrg() as any;
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)
  const pathname = usePathname()
  const { t } = useTranslation()
  const { rights } = useAdminStatus()
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const { isVisible: isJoinBannerVisible } = useJoinBannerVisible()
  const { track } = useLHAnalytics()

  const [bubbleOpen, setBubbleOpen] = useState(false)
  const [bubbleSessionToLoad, setBubbleSessionToLoad] = useState<string | null>(null)
  const [isBubbleMode, setIsBubbleMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('copilot-bubble-mode')
    return stored === 'true'
  })

  const toggleBubbleMode = (value: boolean) => {
    setIsBubbleMode(value)
    localStorage.setItem('copilot-bubble-mode', String(value))
    if (!value) setBubbleOpen(false)
  }

  const openBubbleWithSession = (sessionUuid?: string) => {
    if (sessionUuid) setBubbleSessionToLoad(sessionUuid)
    setBubbleOpen(true)
  }
  const topOffset = isJoinBannerVisible ? JOIN_BANNER_HEIGHT : 0

  const config = org?.config?.config
  const primaryColor = config?.customization?.general?.color || config?.general?.color || ''
  const colors = getMenuColorClasses(primaryColor)

  const rf = config?.resolved_features
  const visibleDashboardItems = DASHBOARD_MENU_ITEMS.filter((item: DashboardMenuItem) => {
    if (!item.featureKey) return true
    if (rf?.[item.featureKey]) return rf[item.featureKey].enabled
    return isFeatureAvailable(item.featureKey)
  })

  useEffect(() => {

    if (typeof window !== 'undefined' && pathname?.includes('/activity/')) {
      const saved = localStorage.getItem('globalFocusMode');
      setIsFocusMode(saved === 'true');
    } else {
      setIsFocusMode(false);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'globalFocusMode' && pathname?.includes('/activity/')) {
        setIsFocusMode(e.newValue === 'true');
      }
    };

    const handleFocusModeChange = (e: CustomEvent) => {
      if (pathname?.includes('/activity/')) {
        setIsFocusMode(e.detail.isFocusMode);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focusModeChange', handleFocusModeChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focusModeChange', handleFocusModeChange as EventListener);
    };
  }, [pathname]);

  useEffect(() => { setIsMenuOpen(false) }, [pathname])

  function toggleMenu() {
    setIsMenuOpen(!isMenuOpen)
  }

  if (pathname?.includes('/activity/') && isFocusMode) {
    return null;
  }

  return (
    <>
      <div className="backdrop-blur-lg h-[60px] blur-3xl" style={{ zIndex: 'var(--z-behind)', marginTop: topOffset }}></div>
      <nav
        aria-label="Top navigation"
        className={`backdrop-blur-lg fixed start-0 end-0 h-[60px] ${!primaryColor ? 'bg-white/90 nice-shadow' : ''}`}
        style={{
          zIndex: 'var(--z-nav)',
          backgroundColor: primaryColor || undefined,
          top: topOffset
        }}
      >
        <div className="flex items-center justify-between w-full max-w-(--breakpoint-2xl) mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center space-x-5 lg:w-auto w-full">
            <div className="logo flex lg:w-auto w-full justify-center">
              <Link href={getUriWithOrg(orgslug, '/')}>
                <div className="flex w-auto h-9 rounded-md items-center m-auto py-1 justify-center">
                  {org?.logo_image ? (
                    <img
                      src={`${getOrgLogoMediaDirectory(org.org_uuid, org?.logo_image)}`}
                      alt={org?.name || BESTDEVS_LMS_NAME}
                      style={{ width: 'auto', height: '100%' }}
                      className="rounded-md"
                    />
                  ) : (
                    <BestDevsLogo
                      showName
                      className="h-8 w-8 rounded-md bg-black p-1"
                      wrapperClassName="flex items-center gap-2"
                      nameClassName={`font-bold ${colors.text}`}
                    />
                  )}
                </div>
              </Link>
            </div>
            <div className="hidden lg:flex">
              <MenuLinks orgslug={orgslug} primaryColor={primaryColor} />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {session?.status === 'authenticated' && rights?.dashboard?.action_access && (
              <div className="hidden lg:flex">
                <DropdownMenu>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={`p-2 rounded-lg transition-colors ${colors.iconBtn}`}
                            aria-label={t('common.dashboard')}
                          >
                            <SquaresFour size={20} weight="fill" />
                          </button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        {t('common.dashboard')}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="flex items-center gap-2">
                      <SquaresFour size={16} weight="fill" />
                      <span>{t('common.dashboard')}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {visibleDashboardItems.map((item) => {
                      const IconComponent = item.icon
                      return (
                        <DropdownMenuItem key={item.id} asChild>
                          <Link
                            href={item.href}
                            className="flex items-center gap-2"
                            onClick={() => track(AnalyticsEvent.DashboardEntered, { source: 'org_menu' })}
                          >
                            <IconComponent size={16} weight="fill" />
                            <span>{t(item.labelKey)}</span>
                          </Link>
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            {session?.status === 'authenticated' && rights?.dashboard?.action_access && (
              <div className="hidden lg:flex">
                <DropdownMenu>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={`p-2 rounded-lg transition-colors ${colors.iconBtn}`}
                            aria-label={t('common.help')}
                          >
                            <Question size={20} weight="fill" />
                          </button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        {t('common.help')}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="flex items-center gap-2">
                      <Question size={16} weight="fill" />
                      <span>{t('common.help')}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <a
                        href={resolveBestDevsLandingUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <Globe size={16} weight="fill" />
                        <span>{t('common.help_menu.website')}</span>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setFeedbackModalOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <ChatCircleDots size={16} weight="fill" />
                      <span>{t('common.help_menu.report_feedback')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            <div className="hidden lg:flex">
              <HeaderProfileBox primaryColor={primaryColor} />
            </div>
            <button
              aria-label={isMenuOpen ? t('student_experience.close_menu') : t('student_experience.open_menu')}
              aria-expanded={isMenuOpen}
              aria-controls="student-mobile-menu"
              className={`lg:hidden min-h-11 min-w-11 flex items-center justify-center rounded-lg focus-visible:ring-2 ${colors.text}`}
              onClick={toggleMenu}
            >
              {isMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>
      <div
        id="student-mobile-menu"
        inert={!isMenuOpen}
        className={`fixed inset-x-0 bg-white/80 backdrop-blur-lg lg:hidden shadow-lg transition-all duration-300 ease-in-out ${
          isMenuOpen ? 'opacity-100' : '-top-full opacity-0 pointer-events-none'
        }`}
        style={{
          zIndex: 'var(--z-nav-menu)',
          top: isMenuOpen ? topOffset + 60 : undefined
        }}
      >
        <div className="flex flex-col px-4 py-3 space-y-4 justify-center items-center">
          <div className='py-4'>
            <MenuLinks orgslug={orgslug} />
          </div>
          <div className="border-t border-gray-200">
            <HeaderProfileBox />
          </div>
        </div>
      </div>
      <FeedbackModal
        open={feedbackModalOpen}
        onOpenChange={setFeedbackModalOpen}
        theme="light"
        userName={session?.data?.user?.username}
        userEmail={session?.data?.user?.email}
      />
    </>
  )
}

const CopilotMenuButton = ({
  orgslug,
  isBubbleMode,
  onToggleBubbleMode,
  bubbleOpen,
  onOpenBubble,
}: {
  orgslug: string
  iconBtnClass: string
  isBubbleMode: boolean
  onToggleBubbleMode: (_v: boolean) => void
  bubbleOpen: boolean
  onOpenBubble: (_sessionUuid?: string) => void
}) => {
  const session = useLHSession() as any
  const accessToken = session?.data?.tokens?.access_token
  const [isOpen, setIsOpen] = useState(false)

  const { data: sessions } = useQuery<RAGChatSession[]>({
    queryKey: queryKeys.ai.ragSessions(orgslug),
    queryFn: () => fetchRAGChatSessions(accessToken, orgslug),
    enabled: isOpen && !!accessToken && !!orgslug,
    staleTime: 60_000,
  })

  const recentSessions = (sessions || []).slice(0, 5)

  return (
    <DropdownMenu onOpenChange={setIsOpen}>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                className="relative p-2 rounded-lg transition-colors hover:bg-violet-500/10"
                aria-label="Copilot"
              >
                <ChatCircle size={20} weight="fill" className="text-violet-500" />
                {isBubbleMode && bubbleOpen && (
                  <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-violet-500 ring-2 ring-white dark:ring-neutral-900" />
                )}
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Copilot
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <ChatCircle size={16} weight="fill" className="text-violet-500" />
          <span>Copilot</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {recentSessions.length > 0 ? (
          <>
            {recentSessions.map((s) => (
              isBubbleMode ? (
                <DropdownMenuItem
                  key={s.aichat_uuid}
                  onSelect={() => onOpenBubble(s.aichat_uuid)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <ChatCircleDots size={14} weight="fill" className="shrink-0 text-neutral-400" />
                  <span className="truncate text-sm">{s.title || 'Untitled'}</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem key={s.aichat_uuid} asChild>
                  <Link href={getUriWithOrg(orgslug, `/copilot?chat=${s.aichat_uuid}`)} className="flex items-center gap-2">
                    <ChatCircleDots size={14} weight="fill" className="shrink-0 text-neutral-400" />
                    <span className="truncate text-sm">{s.title || 'Untitled'}</span>
                  </Link>
                </DropdownMenuItem>
              )
            ))}
            <DropdownMenuSeparator />
          </>
        ) : (
          <div className="px-2 py-3 text-center">
            <p className="text-xs text-neutral-400">No conversations yet</p>
          </div>
        )}
        {isBubbleMode ? (
          <DropdownMenuItem
            onSelect={() => onOpenBubble()}
            className="flex items-center gap-2 font-medium cursor-pointer"
          >
            <ChatCircle size={14} weight="fill" className="text-violet-500" />
            <span>{recentSessions.length > 0 ? 'New conversation' : 'Start a conversation'}</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link href={getUriWithOrg(orgslug, '/copilot')} className="flex items-center gap-2 font-medium">
              <ChatCircle size={14} weight="fill" className="text-violet-500" />
              <span>{recentSessions.length > 0 ? 'View all conversations' : 'Start a conversation'}</span>
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <button
          onClick={() => onToggleBubbleMode(!isBubbleMode)}
          className="w-full flex items-center justify-between px-2 py-2 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors group"
        >
          <span className="text-xs text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
            Open in bubble
          </span>
          <span
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors flex-shrink-0 ${
              isBubbleMode ? 'bg-violet-500' : 'bg-neutral-200 dark:bg-neutral-600'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
                isBubbleMode ? 'translate-x-3.5 rtl:-translate-x-3.5' : 'translate-x-0.5 rtl:-translate-x-0.5'
              }`}
            />
          </span>
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
