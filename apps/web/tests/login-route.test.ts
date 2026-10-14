import { expect, test } from 'bun:test'
import { NextRequest } from 'next/server'
import proxy from '../proxy'

test('a stale session marker cannot block login or discard the intended course', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => Response.json({ tenancy: 'single', default_org_slug: 'school', frontend_domain: 'localhost:3000', top_domain: 'localhost', mode: 'oss', multi_org_enabled: false })) as typeof fetch
  try {
    const request = new NextRequest('http://localhost:3000/login?next=%2Fcourse%2Fexample', { headers: { cookie: 'LH_session=1' } })
    const result = await proxy(request)
    expect(result.status).toBe(200)
    expect(result.headers.get('location')).toBeNull()
    const destination = new URL(result.headers.get('x-middleware-rewrite')!)
    expect(destination.pathname).toBe('/auth/login')
    expect(destination.searchParams.get('next')).toBe('/course/example')
  } finally {
    globalThis.fetch = originalFetch
  }
})
