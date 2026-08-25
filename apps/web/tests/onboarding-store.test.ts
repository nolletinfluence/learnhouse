import { describe, expect, test } from 'bun:test'

import {
  createOnboardingStore,
  type OnboardingStorage,
} from '../components/Hooks/onboardingStore'

function memoryStorage(initial?: string): OnboardingStorage {
  let value = initial ?? null
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next
    },
  }
}

describe('onboarding external store', () => {
  test('persists before notifying every same-tab subscriber', () => {
    const notifications: string[] = []
    const storage = memoryStorage()
    const store = createOnboardingStore(storage, new EventTarget())
    store.subscribe(() => {
      expect(storage.getItem('lh_onboarding')).not.toBeNull()
      notifications.push(store.getSnapshot().minimized ? 'minimized' : 'open')
    })

    store.update((state) => ({ ...state, minimized: true }))

    expect(notifications).toEqual(['minimized'])
  })

  test('uses defaults for corrupt JSON and skips identical updates', () => {
    const store = createOnboardingStore(memoryStorage('{broken'), new EventTarget())
    let notifications = 0
    store.subscribe(() => notifications++)

    store.update((state) => state)

    expect(store.getSnapshot().completedSteps).toEqual([])
    expect(store.getSnapshot().dismissed).toBe(false)
    expect(notifications).toBe(0)
  })

  test('refreshes its snapshot after a storage event', () => {
    const storage = memoryStorage()
    const events = new EventTarget()
    const store = createOnboardingStore(storage, events)
    let notifications = 0
    store.subscribe(() => notifications++)
    storage.setItem(
      'lh_onboarding',
      JSON.stringify({ minimized: true, completedSteps: ['create_course'] })
    )

    events.dispatchEvent(new Event('storage'))

    expect(store.getSnapshot().minimized).toBe(true)
    expect(store.getSnapshot().completedSteps).toEqual(['create_course'])
    expect(notifications).toBe(1)
  })
})
