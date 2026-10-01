import { House, BookOpen, Files, Users, CalendarBlank, ClipboardText } from '@phosphor-icons/react'

export interface DashboardMenuItem {
  id: string
  href: string
  icon: typeof House
  labelKey: string
  featureKey?: string
  defaultDisabled?: boolean
}

export const DASHBOARD_MENU_ITEMS: DashboardMenuItem[] = [
  { id: 'home', href: '/dash', icon: House, labelKey: 'common.home' },
  { id: 'courses', href: '/dash/courses', icon: BookOpen, labelKey: 'courses.courses' },
  { id: 'calendar', href: '/dash/calendar', icon: CalendarBlank, labelKey: 'school.calendar' },
  { id: 'applications', href: '/dash/applications', icon: ClipboardText, labelKey: 'school.applications' },
  { id: 'assignments', href: '/dash/assignments', icon: Files, labelKey: 'common.assignments' },
  { id: 'users', href: '/dash/users/settings/users', icon: Users, labelKey: 'common.users' },
]

/*
export const DASHBOARD_MENU_ITEMS: DashboardMenuItem[] = [
  {
    id: 'home',
    href: '/dash',
    icon: House,
    labelKey: 'common.home',
  },
  {
    id: 'courses',
    href: '/dash/courses',
    icon: BookOpen,
    labelKey: 'courses.courses',
  },
  {
    id: 'assignments',
    href: '/dash/assignments',
    icon: Files,
    labelKey: 'common.assignments',
  },
  {
    id: 'library',
    href: '/dash/library',
    icon: FolderSimple,
    labelKey: 'library.library',
    featureKey: 'folders',
  },
  {
    id: 'communities',
    href: '/dash/communities',
    icon: ChatsCircle,
    labelKey: 'communities.title',
    featureKey: 'communities',
  },
  {
    id: 'podcasts',
    href: '/dash/podcasts',
    icon: Headphones,
    labelKey: 'podcasts.podcasts',
    featureKey: 'podcasts',
  },
  {
    id: 'boards',
    href: '/dash/boards',
    icon: ChalkboardSimple,
    labelKey: 'common.boards',
    featureKey: 'boards',
    defaultDisabled: true,
  },
  {
    id: 'playgrounds',
    href: '/dash/playgrounds',
    icon: Cube,
    labelKey: 'common.playgrounds',
    featureKey: 'playgrounds',
    defaultDisabled: true,
  },
  {
    id: 'users',
    href: '/dash/users/settings/users',
    icon: Users,
    labelKey: 'common.users',
  },
  {
    id: 'payments',
    href: '/dash/payments/overview',
    icon: CurrencyCircleDollar,
    labelKey: 'common.payments',
    featureKey: 'payments',
  },
  {
    id: 'organization',
    href: '/dash/org/settings/general',
    icon: Buildings,
    labelKey: 'common.organization',
  },
  {
    id: 'analytics',
    href: '/dash/analytics',
    icon: ChartBar,
    labelKey: 'common.analytics',
  },
  {
    id: 'developers',
    href: '/dash/developers/api',
    icon: Code,
    labelKey: 'dashboard.developers.breadcrumb',
  },
]

*/
