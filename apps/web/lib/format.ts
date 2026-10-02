import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { normalizeLocale } from './locale'
import 'dayjs/locale/ru'

dayjs.extend(relativeTime)

export async function loadDateLocale(lng?: string): Promise<void> {
  dayjs.locale(normalizeLocale(lng))
}

export function formatDate(
  value: string | number | Date,
  lng?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(normalizeLocale(lng), {
    dateStyle: 'medium',
    calendar: 'gregory',
    ...options,
  }).format(new Date(value))
}

export function formatDateTime(
  value: string | number | Date,
  lng?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  return formatDate(value, lng, { dateStyle: 'medium', timeStyle: 'short', ...options })
}

export function formatRelative(value: string | number | Date, lng?: string): string {
  return dayjs(value).locale(normalizeLocale(lng)).fromNow()
}

export function formatNumber(
  value: number,
  lng?: string,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(normalizeLocale(lng), options).format(value)
}

export function formatCurrency(
  value: number,
  currency: string,
  lng?: string,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(normalizeLocale(lng), {
    style: 'currency',
    currency,
    ...options,
  }).format(value)
}

export function formatPercent(
  value: number,
  lng?: string,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(normalizeLocale(lng), {
    style: 'percent',
    maximumFractionDigits: 0,
    ...options,
  }).format(value)
}
