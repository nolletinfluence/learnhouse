import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

export const DEFAULT_LEARNING_SETTINGS = {
  duration_months: 4,
  lessons_per_month: 12,
  price: null as string | null,
  currency: 'KGS',
  timezone: 'Asia/Bishkek',
}

export function lessonDateInput(value: string | undefined, zone = 'Asia/Bishkek') {
  return value ? dayjs(value).tz(zone).format('YYYY-MM-DDTHH:mm') : ''
}

export function lessonDateISO(value: string, zone = 'Asia/Bishkek') {
  if (!value) return null
  const result = dayjs.tz(value, zone)
  if (!result.isValid() || result.format('YYYY-MM-DDTHH:mm') !== value) throw new Error('Проверьте дату и время занятия')
  return result.toISOString()
}

export function lessonDateLabel(value?: string, zone = 'Asia/Bishkek') {
  if (!value) return 'Дата ещё не назначена'
  return new Intl.DateTimeFormat('ru', {
    timeZone: zone, day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

export function courseMonths(chapters: any[], duration: number) {
  const assigned = new Map<number, any>()
  const remaining: any[] = []
  for (const chapter of chapters) {
    const number = Number(chapter.extra_metadata?.bestdevs_month)
    if (Number.isInteger(number) && number >= 1 && number <= 12 && !assigned.has(number)) assigned.set(number, chapter)
    else remaining.push(chapter)
  }
  let number = 1
  for (const chapter of remaining) {
    while (assigned.has(number)) number++
    assigned.set(number++, chapter)
  }
  return Array.from({ length: Math.max(duration, ...assigned.keys()) }, (_, index) => ({
    number: index + 1, chapter: assigned.get(index + 1),
  }))
}


export function canApproveCourseApplications(session: any, orgId?: number): boolean {
  if (!orgId || session?.status !== 'authenticated') return false
  if (session.data?.user?.is_superadmin === true) return true
  return (session.data?.roles || []).some((entry: any) => entry.org?.id === orgId && entry.role?.id === 1)
}
