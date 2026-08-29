import 'server-only'
import { buildWelcomeAccountMail } from './bestdevs-mail'
import { send } from './resend'

export async function sendWelcomeAccountMail(args: { email: string; username?: string }): Promise<void> {
  const { email, username } = args
  const mail = buildWelcomeAccountMail(username)
  await send(email, mail.subject, mail.props)
}

export async function sendContactMail(args: {
  fromEmail: string
  name?: string
  message: string
  to?: string
}): Promise<void> {
  const { fromEmail, name, message, to } = args
  await send(to || process.env.LEARNHOUSE_CONTACT_EMAIL || 'hello@bestdevs.kg', `New contact form message from ${name || fromEmail}`, {
    accentColor: '#171717',
    heading: 'New contact message',
    subtitle: `From ${name ? `${name} · ` : ''}${fromEmail}`,
    body: message,
  })
}
