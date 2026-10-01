import { describe, expect, test } from 'bun:test'
import { canApproveCourseApplications, courseMonths, lessonDateISO, lessonDateInput } from '../lib/learning'
import { automaticCourseSEO } from '../lib/seo/course'

describe('School course planning', () => {
  test('existing chapters and explicitly assigned months appear once', () => {
    const chapters = [{ id: 1 }, { id: 2, extra_metadata: { bestdevs_month: 2 } }, { id: 3 }]
    const months = courseMonths(chapters, 4)
    expect(months.map(month => month.chapter?.id)).toEqual([1, 2, 3, undefined])
  })
  test('shrinking duration preserves existing months', () => {
    const chapters = [{ id: 1, extra_metadata: { bestdevs_month: 6 } }]
    expect(courseMonths(chapters, 4)).toHaveLength(6)
  })
  test('local lesson time round trips through UTC', () => {
    const iso = lessonDateISO('2026-10-03T18:00', 'Asia/Bishkek')
    expect(iso).toBe('2026-10-03T12:00:00.000Z')
    expect(lessonDateInput(iso!)).toBe('2026-10-03T18:00')
    expect(lessonDateISO('')).toBeNull()
  })
  test('rejects a date normalized into a DST gap', () => {
    expect(() => lessonDateISO('2026-03-08T02:30', 'America/New_York')).toThrow()
  })
})

describe('Automatic LMS SEO', () => {
  test('derives metadata from the course rather than stale manual overrides', () => {
    const seo = automaticCourseSEO({ name: 'Фронтенд', description: '<p>HTML и CSS</p>', published: true, public: true,
      extra_metadata: { bestdevs_learning: { duration_months: 4 } }, seo: { title: 'Старое название' } })
    expect(seo.title).toBe('Фронтенд · 4 мес. — BestDevs')
    expect(seo.description).toBe('HTML и CSS')
    expect(seo.index).toBeTrue()
  })
  test('private and unpublished courses are never indexed', () => {
    expect(automaticCourseSEO({ public: false, published: true }).index).toBeFalse()
    expect(automaticCourseSEO({ public: true, published: false }).index).toBeFalse()
  })
})


test('course application controls require the administrator role of this organization', () => {
  const session = { status: 'authenticated', data: { user: { is_superadmin: false }, roles: [{ org: { id: 1 }, role: { id: 1 } }] } }
  expect(canApproveCourseApplications(session, 1)).toBe(true)
  expect(canApproveCourseApplications(session, 2)).toBe(false)
  session.data.roles[0].role.id = 2
  expect(canApproveCourseApplications(session, 1)).toBe(false)
  session.data.roles[0].role.id = 3
  expect(canApproveCourseApplications(session, 1)).toBe(false)
  session.data.user.is_superadmin = true
  expect(canApproveCourseApplications(session, 1)).toBe(true)
  session.status = 'unauthenticated'
  expect(canApproveCourseApplications(session, 1)).toBe(false)
})
