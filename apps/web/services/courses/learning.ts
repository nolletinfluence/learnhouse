import { getAPIUrl } from '@services/config/config'
import { RequestBodyWithAuthHeader } from '@services/utils/ts/requests'

export async function learningRequest(path: string, token?: string, method = 'GET', data?: unknown) {
  const response = await fetch(`${getAPIUrl()}learning/${path}`, RequestBodyWithAuthHeader(method, data ?? null, null, token))
  const result = await response.json()
  if (!response.ok) {
    throw new Error(typeof result.detail === 'string' ? result.detail : 'Не удалось сохранить. Проверьте доступ и попробуйте ещё раз.')
  }
  return result
}

export function courseLearningPath(uuid: string) {
  return `courses/course_${uuid.replace(/^course_/, '')}`
}
