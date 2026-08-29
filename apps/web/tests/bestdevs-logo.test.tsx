import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

describe('BestDevs LMS visual identity', () => {
  test('renders the canonical logo and optional product name', async () => {
    const logoModule = await import('../components/Brand/BestDevsLogo').catch(() => null)
    expect(logoModule).not.toBeNull()
    if (!logoModule) return

    const html = renderToStaticMarkup(
      <logoModule.BestDevsLogo showName className="brand-mark" />,
    )

    expect(html).toContain('src="/bestdevs-logo.png"')
    expect(html).toContain('alt=""')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('BestDevs LMS</span>')
    expect(html.toLowerCase()).not.toContain('learnhouse')

    const markOnly = renderToStaticMarkup(<logoModule.BestDevsLogo />)
    expect(markOnly).toContain('alt="BestDevs LMS"')
  })
})
