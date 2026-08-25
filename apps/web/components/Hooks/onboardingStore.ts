export type OnboardingState = {
  completedSteps: string[]
  skippedSteps: string[]
  minimized: boolean
  expanded: boolean
  showAllSteps: boolean
  dismissed: boolean
  welcomeSeen: boolean
}

export type OnboardingStorage = Pick<Storage, 'getItem' | 'setItem'>

type Updater = (state: OnboardingState) => OnboardingState
type Listener = () => void

const STORAGE_KEY = 'lh_onboarding'

const SERVER_SNAPSHOT: OnboardingState = {
  completedSteps: [],
  skippedSteps: [],
  minimized: false,
  expanded: false,
  showAllSteps: false,
  dismissed: false,
  welcomeSeen: false,
}

function defaultState(): OnboardingState {
  return {
    ...SERVER_SNAPSHOT,
    completedSteps: [],
    skippedSteps: [],
  }
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function parseState(raw: string | null): OnboardingState {
  if (!raw) return defaultState()
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      completedSteps: stringArray(parsed.completedSteps),
      skippedSteps: stringArray(parsed.skippedSteps),
      minimized: parsed.minimized === true,
      expanded: parsed.expanded === true,
      showAllSteps: parsed.showAllSteps === true,
      dismissed: parsed.dismissed === true,
      welcomeSeen: parsed.welcomeSeen === true,
    }
  } catch {
    return defaultState()
  }
}

function readState(storage: OnboardingStorage | null): OnboardingState {
  if (!storage) return defaultState()
  try {
    return parseState(storage.getItem(STORAGE_KEY))
  } catch {
    return defaultState()
  }
}

function statesEqual(left: OnboardingState, right: OnboardingState): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function createOnboardingStore(
  storage: OnboardingStorage | null,
  eventTarget: EventTarget | null
) {
  let snapshot = readState(storage)
  const listeners = new Set<Listener>()
  let listening = false

  const notify = () => listeners.forEach((listener) => listener())

  const refresh = () => {
    const next = readState(storage)
    if (statesEqual(snapshot, next)) return
    snapshot = next
    notify()
  }

  const startListening = () => {
    if (listening || !eventTarget) return
    eventTarget.addEventListener('storage', refresh)
    listening = true
  }

  const stopListening = () => {
    if (!listening || !eventTarget || listeners.size > 0) return
    eventTarget.removeEventListener('storage', refresh)
    listening = false
  }

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => SERVER_SNAPSHOT,
    subscribe: (listener: Listener) => {
      listeners.add(listener)
      startListening()
      return () => {
        listeners.delete(listener)
        stopListening()
      }
    },
    update: (updater: Updater) => {
      const next = updater(snapshot)
      if (next === snapshot || statesEqual(snapshot, next)) return
      try {
        storage?.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        snapshot = next
        notify()
        return
      }
      snapshot = next
      notify()
    },
  }
}

let browserStore: ReturnType<typeof createOnboardingStore> | undefined
const serverStore = createOnboardingStore(null, null)

export function getOnboardingStore() {
  if (typeof window === 'undefined') return serverStore
  browserStore ??= createOnboardingStore(window.localStorage, window)
  return browserStore
}
