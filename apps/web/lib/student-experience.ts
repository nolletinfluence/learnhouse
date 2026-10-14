export function courseRun(course: any, trail: any) {
  const uuid = course?.course_uuid?.replace(/^course_/, '')
  return trail?.runs?.find((entry: any) =>
    entry.status !== 'STATUS_CANCELLED' &&
    (entry.course?.course_uuid || entry.course_uuid)?.replace(/^course_/, '') === uuid
  )
}

export function courseProgress(course: any, trail: any) {
  const lessons = (course?.chapters || []).flatMap((chapter: any) =>
    (chapter.activities || []).filter((activity: any) => activity.published !== false)
  )
  const run = courseRun(course, trail)
  const completedIds = new Set((run?.steps || [])
    .filter((step: any) => step.complete === true && step.teacher_verified === true)
    .map((step: any) => step.activity_id))
  const completed = lessons.filter((lesson: any) => completedIds.has(lesson.id)).length
  const total = lessons.length
  return { completed, total, percentage: total ? Math.round(completed / total * 100) : 0 }
}

export function headingId(text: string, position = 0) {
  const slug = text.normalize('NFKC').toLowerCase().trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
  return `heading-${slug || 'section'}-${position}`
}

export function paymentsEnabled(org: any): boolean {
  const config = org?.config?.config
  return (config?.resolved_features?.payments?.enabled ?? config?.features?.payments?.enabled) === true
}

export function meetingLink(value: string): string | null {
  try {
    const url = new URL(value.trim())
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}


export function authReturnPath(params: Pick<URLSearchParams, 'get'>) {
  const raw = params.get('next') ?? params.get('redirect') ?? params.get('redirect_to')
  const hasUnsafeCharacters = raw && Array.from(raw).some(character =>
    character === '\\' || character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
  )
  return raw && /^\/(?!\/)/.test(raw) && !hasUnsafeCharacters ? raw : null
}

export function authReturnQuery(params: Pick<URLSearchParams, 'get'>) {
  const next = authReturnPath(params)
  return next ? `?${new URLSearchParams({ next })}` : ''
}
