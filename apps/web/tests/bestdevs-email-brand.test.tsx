import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import LearnHouseEmail from '../components/Emails/LearnHouseEmail'

describe('BestDevs LMS transactional email branding', () => {
  test('renders the canonical product identity without the upstream brand', () => {
    const html = renderToStaticMarkup(
      <LearnHouseEmail
        accentColor="#171717"
        heading="Welcome"
        subtitle="Your account is ready"
      />,
    )

    expect(html).toContain('BestDevs LMS')
    expect(html.toLowerCase()).not.toContain('learnhouse')
  })

  test('builds welcome messages with BestDevs destinations', async () => {
    const mailModule = await import('../services/emails/bestdevs-mail').catch(() => null)
    expect(mailModule).not.toBeNull()

    const mail = mailModule!.buildWelcomeAccountMail('Asim', 'https://bestdevs.dev///')

    expect(mail.subject).toBe('Welcome to BestDevs LMS 👋')
    expect(mail.props.heading).toBe('Welcome to BestDevs LMS!')
    expect(mail.props.cta).toEqual({ label: 'Get started', href: 'https://bestdevs.dev/#apply' })
    expect(JSON.stringify(mail).toLowerCase()).not.toContain('learnhouse')
  })

  test('builds purchase confirmations for the BestDevs product', async () => {
    const mailModule = await import('../services/emails/bestdevs-mail')
    expect(typeof mailModule.buildPurchaseCompleteMail).toBe('function')

    const mail = mailModule.buildPurchaseCompleteMail('standard', 'bestdevs')

    expect(mail.props.subtitle).toBe(
      'Your Standard plan is now active. Thanks for supporting BestDevs LMS.',
    )
    expect(JSON.stringify(mail).toLowerCase()).not.toContain('learnhouse')
  })
})
