import { expect, test } from 'bun:test'
import { courseProgress, headingId, meetingLink, paymentsEnabled, authReturnQuery, learningSummary, lessonLearningState, resumeActivity, activeLearningRuns, nextScheduledLesson } from '../lib/student-experience'

test('progress joins nested course identity and counts only published mentor-confirmed lessons once', () => {
  const course = { course_uuid: 'course_abc', chapters: [{ activities: [{ id: 1 }, { id: 2 }, { id: 3, published: false }] }] }
  const trail = { runs: [{ course: { course_uuid: 'course_other' }, steps: [{ activity_id: 2, complete: true, teacher_verified: true }] }, { course: { course_uuid: 'course_abc' }, steps: [
    { activity_id: 1, complete: true, teacher_verified: true },
    { activity_id: 1, complete: true, teacher_verified: true },
    { activity_id: 2, complete: true, teacher_verified: false },
    { activity_id: 3, complete: true, teacher_verified: true },
  ] }] }
  expect(courseProgress(course, trail)).toEqual({ completed: 1, total: 2, percentage: 50 })
  trail.runs[1].steps[2].teacher_verified = true
  expect(courseProgress(course, trail).percentage).toBe(100)
  expect(courseProgress({ ...course, chapters: [] }, trail).percentage).toBe(0)
})

test('heading targets preserve Cyrillic, distinguish repeated headings and remain stable for punctuation', () => {
  expect(headingId('  Что дальше? ', 7)).toBe('heading-что-дальше-7')
  expect(headingId('Что дальше?', 7)).not.toBe(headingId('Что дальше?', 25))
  expect(headingId('!!!', 9)).toBe(headingId('!!!', 9))
  expect(headingId('!!!', 9)).not.toContain('undefined')
})

test('meeting links accept web addresses and reject script or malformed locations', () => {
  expect(meetingLink('https://example.com/class')).toBe('https://example.com/class')
  expect(meetingLink('javascript:alert(1)')).toBeNull()
  expect(meetingLink('Аудитория 12')).toBeNull()
})

test('resolved payment availability overrides a legacy enabled flag', () => {
  expect(paymentsEnabled({ config: { config: { resolved_features: { payments: { enabled: false } }, features: { payments: { enabled: true } } } } })).toBeFalse()
  expect(paymentsEnabled({ config: { config: { features: { payments: { enabled: true } } } } })).toBeTrue()
  expect(paymentsEnabled(null)).toBeFalse()
})


test('cancelled runs do not supply progress to a newly approved course', () => {
  const course = { course_uuid: 'course_abc', chapters: [{ activities: [{ id: 1 }] }] }
  const trail = { runs: [{ status: 'STATUS_CANCELLED', course_uuid: 'course_abc', steps: [{ activity_id: 1, complete: true, teacher_verified: true }] }] }
  expect(courseProgress(course, trail).completed).toBe(0)
})


test('auth navigation preserves only a safe course return path', () => {
  expect(authReturnQuery(new URLSearchParams('next=%2Fcourse%2Fexample&email=private&password=secret'))).toBe('?next=%2Fcourse%2Fexample')
  expect(authReturnQuery(new URLSearchParams('next=https%3A%2F%2Fevil.example'))).toBe('')
  expect(authReturnQuery(new URLSearchParams({ next: '/\\evil.example' }))).toBe('')
  expect(authReturnQuery(new URLSearchParams('next=%2F%2Fevil.example'))).toBe('')
  expect(authReturnQuery(new URLSearchParams({ next: '/\t/evil.example' }))).toBe('')
  expect(authReturnQuery(new URLSearchParams({ next: '/\n/evil.example' }))).toBe('')
})


test('opened material is pending and mentor marks control credit, including zero grades and absence', () => {
  const course = { chapters: [{ activities: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4, published: false }] }] }
  const run = { data: { bestdevs_learning: { opened_activity_ids: [1, 2, 3, 4] } }, steps: [
    { activity_id: 1, complete: true, teacher_verified: true, grade: '0' },
    { activity_id: 1, complete: true, teacher_verified: true },
    { activity_id: 2, complete: false, teacher_verified: true, data: { attendance: 'absent' } },
  ] }
  expect(learningSummary(course, run)).toEqual({ completed: 1, pending: 1, remaining: 1, total: 3, percentage: 33 })
  expect(lessonLearningState(run, 2)).toBe('absent')
  expect(lessonLearningState({ ...run, steps: [{ activity_id: 2, teacher_verified: true, data: { attendance: 'excused' } }] }, 2)).toBe('excused')
  expect(lessonLearningState({ steps: [{ activity_id: 5, complete: false, teacher_verified: false }] }, 5)).toBe('pending')
  expect(lessonLearningState({ ...run, status: 'STATUS_CANCELLED' }, 1)).toBe('not_started')
})

test('resume uses the saved published accessible lesson, skips credited and stale targets, and ends only at real completion', () => {
  const course = { published: true, chapters: [{ activities: [
    { id: 1, activity_uuid: 'activity_1' }, { id: 2, activity_uuid: 'activity_2' },
    { id: 3, activity_uuid: 'activity_3', published: false }, { id: 4, activity_uuid: 'activity_4', is_locked: true },
  ] }] }
  const run = { data: { bestdevs_learning: { last_activity_uuid: 'activity_2', opened_activity_ids: [2] } }, steps: [] as any[] }
  expect(resumeActivity(course, run)).toMatchObject({ activity_uuid: 'activity_2' })
  for (const uuid of ['activity_3', 'activity_4', 'activity_deleted']) {
    run.data.bestdevs_learning.last_activity_uuid = uuid
    expect(resumeActivity(course, run)).toMatchObject({ activity_uuid: 'activity_1' })
  }
  run.steps = [{ activity_id: 1, complete: true, teacher_verified: true }]
  expect(resumeActivity(course, run)).toMatchObject({ activity_uuid: 'activity_2' })
  run.steps.push({ activity_id: 2, complete: true, teacher_verified: true }, { activity_id: 4, complete: true, teacher_verified: true })
  expect(resumeActivity(course, run)).toBe('end')
  expect(resumeActivity({ ...course, published: false }, run)).toBeNull()
  expect(resumeActivity(course, { ...run, status: 'STATUS_CANCELLED' })).toBeNull()
  expect(resumeActivity({ chapters: [] }, run)).toBeNull()
})

test('the learning home prioritizes recent unfinished courses and includes no cancelled enrollment', () => {
  const course = { course_uuid: 'course_first', published: true }
  const base = { course, lessons: [{ id: 1, activity_uuid: 'activity_1' }], steps: [], update_date: '2026-10-14T08:00:00Z' }
  const recent = { ...base, id: 2, update_date: '2026-10-14T10:00:00Z' }
  const done = { ...recent, id: 3, steps: [{ activity_id: 1, complete: true, teacher_verified: true }] }
  const unavailable = { ...recent, id: 4, course: { ...course, published: false } }
  expect(activeLearningRuns({ runs: [done, base, unavailable, recent, { ...base, status: 'STATUS_CANCELLED' }] }).map(run => run.id)).toEqual([2, undefined, 3, 4])
  expect(learningSummary(course, done).percentage).toBe(100)
})

test('the nearest lesson includes a running class, ignores past/invalid dates and uses absolute time across offsets', () => {
  const now = Date.parse('2026-10-14T10:00:00Z')
  const runs = [{ course: { course_uuid: 'course_1', published: true } }, { course: { course_uuid: 'course_2' }, status: 'STATUS_CANCELLED' }]
  const lesson = { course_uuid: 'course_1', duration_minutes: 90, activity_uuid: 'activity_nearest' }
  const events = [{ ...lesson, scheduled_at: 'bad' }, { ...lesson, scheduled_at: '2026-10-13T09:00:00Z' },
    { ...lesson, course_uuid: 'course_2', scheduled_at: '2026-10-14T09:45:00Z' },
    { ...lesson, scheduled_at: '2026-10-14T18:00:00+06:00' }, { ...lesson, scheduled_at: '2026-10-14T11:00:00Z' }]
  expect(nextScheduledLesson(events, runs, now).scheduled_at).toBe('2026-10-14T11:00:00Z')
  events.push({ ...lesson, scheduled_at: '2026-10-14T09:30:00Z' })
  expect(nextScheduledLesson(events, runs, now).scheduled_at).toBe('2026-10-14T09:30:00Z')
  expect(nextScheduledLesson(events, [], now)).toBeNull()
})
