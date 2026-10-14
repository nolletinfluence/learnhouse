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

export function courseLessons(course: any, run?: any): any[] {
  return (Array.isArray(course?.chapters)
    ? course.chapters.flatMap((chapter: any) => chapter.activities || [])
    : run?.lessons || []).filter((lesson: any) => lesson.published !== false)
}

export type LessonLearningState = 'credited' | 'pending' | 'absent' | 'excused' | 'not_started'

export function lessonLearningState(run: any, activityId: number): LessonLearningState {
  if (!run || run.status === 'STATUS_CANCELLED') return 'not_started'
  const steps = (run.steps || []).filter((step: any) => step.activity_id === activityId)
  if (steps.some((step: any) => step.complete === true && step.teacher_verified === true)) return 'credited'
  const marked = steps.find((step: any) => step.teacher_verified === true)
  if (marked?.data?.attendance === 'absent') return 'absent'
  if (marked?.data?.attendance === 'excused') return 'excused'
  if (steps.some((step: any) => step.teacher_verified !== true) ||
      run.data?.bestdevs_learning?.opened_activity_ids?.includes(activityId)) return 'pending'
  return 'not_started'
}

export function learningSummary(course: any, run: any) {
  const lessons = courseLessons(course, run)
  const ids = Array.isArray(course?.chapters) || Array.isArray(run?.lessons)
    ? [...new Set<number>(lessons.map((lesson: any) => lesson.id))]
    : [...new Set<number>((run?.steps || []).map((step: any) => step.activity_id))]
  const total = Array.isArray(course?.chapters) || Array.isArray(run?.lessons)
    ? ids.length : Math.max(0, run?.course_total_steps || 0)
  const completed = Math.min(total, ids.filter(id => lessonLearningState(run, id) === 'credited').length)
  const pending = Math.min(total - completed, ids.filter(id => lessonLearningState(run, id) === 'pending').length)
  return { completed, pending, total, remaining: total - completed - pending,
    percentage: total ? Math.round(completed / total * 100) : 0 }
}

export function resumeActivity(course: any, run: any): any | 'end' | null {
  if (!run || run.status === 'STATUS_CANCELLED' || course?.published === false) return null
  const { completed, total } = learningSummary(course, run)
  if (total > 0 && completed === total) return 'end'
  const available = courseLessons(course, run).filter(lesson => !lesson.is_locked && lesson.activity_uuid)
  const last = available.find(lesson => lesson.activity_uuid === run.data?.bestdevs_learning?.last_activity_uuid)
  if (last && lessonLearningState(run, last.id) !== 'credited') return last
  return available.find(lesson => lessonLearningState(run, lesson.id) !== 'credited') || available[0] || null
}

export function activeLearningRuns(trail: any): any[] {
  const timestamp = (value: string) => Date.parse(value) || 0
  return (trail?.runs || []).filter((run: any) => run.status !== 'STATUS_CANCELLED' && run.course?.course_uuid)
    .slice().sort((a: any, b: any) => {
      const aDone = learningSummary(a.course, a), bDone = learningSummary(b.course, b)
      const priority = (run: any, info: typeof aDone) => run.course.published === false ? 2 : info.total > 0 && info.completed === info.total ? 1 : 0
      return priority(a, aDone) - priority(b, bDone) || timestamp(b.update_date) - timestamp(a.update_date)
    })
}

export function nextScheduledLesson(lessons: any[], runs: any[], now = Date.now()) {
  const enrolled = new Set(runs.filter(run => run.status !== 'STATUS_CANCELLED' && run.course?.published !== false)
    .map(run => run.course.course_uuid))
  return lessons.filter(lesson => {
    const start = Date.parse(lesson.scheduled_at)
    return enrolled.has(lesson.course_uuid) && Number.isFinite(start) &&
      start + (Number(lesson.duration_minutes) || 90) * 60_000 > now
  }).slice().sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at))[0] || null
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
