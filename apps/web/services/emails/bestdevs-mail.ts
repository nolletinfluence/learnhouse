import {
  BESTDEVS_LMS_NAME,
  resolveBestDevsApplyUrl,
} from '@lib/bestdevs-brand'

function prettyPlan(plan?: string) {
  return (plan || 'free')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function buildWelcomeAccountMail(username?: string, landingUrl?: string) {
  return {
    subject: `Welcome to ${BESTDEVS_LMS_NAME} 👋`,
    props: {
      accentColor: '#171717',
      heading: `Welcome to ${BESTDEVS_LMS_NAME}!`,
      subtitle: username
        ? `Hey ${username}, we're thrilled to have you on board.`
        : "We're thrilled to have you on board.",
      body: "You're ready to build and share courses. Here's how to get the most out of it:",
      bulletPoints: [
        'Create your first course and add content in minutes.',
        'Invite learners and track their progress.',
        'Brand your school and share it with the world.',
      ],
      cta: { label: 'Get started', href: resolveBestDevsApplyUrl(landingUrl) },
    },
  }
}

export function buildPurchaseCompleteMail(plan?: string, orgSlug?: string, accentColor = '#171717') {
  const planName = prettyPlan(plan)
  return {
    subject: `Welcome to ${planName} 🎉`,
    props: {
      accentColor,
      heading: "Payment received — you're all set!",
      subtitle: `Your ${planName} plan is now active. Thanks for supporting ${BESTDEVS_LMS_NAME}.`,
      card: {
        label: 'Your plan',
        title: planName,
        caption: orgSlug,
        color: accentColor,
      },
      bulletPoints: [
        'All your new plan features are unlocked right away.',
        'Manage or change your plan any time from billing settings.',
      ],
    },
  }
}
