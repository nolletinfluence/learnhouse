import { expect, test } from 'bun:test'
import { courseProgress, headingId, meetingLink, paymentsEnabled, authReturnQuery } from '../lib/student-experience'

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
