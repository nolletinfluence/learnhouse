import 'server-only'
import { cookies } from 'next/headers'
import { normalizeLocale } from './locale'

export async function serverLocale() {
  return normalizeLocale((await cookies()).get('i18next')?.value)
}
