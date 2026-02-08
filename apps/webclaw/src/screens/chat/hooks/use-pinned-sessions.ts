import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type PinnedSessionsState = {
  pinnedSessionKeys: string[]
  pin: (sessionKey: string) => void
  unpin: (sessionKey: string) => void
  isPinned: (sessionKey: string) => boolean
  toggle: (sessionKey: string) => void
}

export const usePinnedSessionsStore = create<PinnedSessionsState>()(
  persist(
    (set, get) => ({
      pinnedSessionKeys: [],
      pin: (sessionKey: string) =>
        set((state) => {
          if (state.pinnedSessionKeys.includes(sessionKey)) return state
          return { pinnedSessionKeys: [...state.pinnedSessionKeys, sessionKey] }
        }),
      unpin: (sessionKey: string) =>
        set((state) => ({
          pinnedSessionKeys: state.pinnedSessionKeys.filter(
            (key) => key !== sessionKey,
          ),
        })),
      isPinned: (sessionKey: string) =>
        get().pinnedSessionKeys.includes(sessionKey),
      toggle: (sessionKey: string) => {
        const { pinnedSessionKeys } = get()
        if (pinnedSessionKeys.includes(sessionKey)) {
          set({
            pinnedSessionKeys: pinnedSessionKeys.filter(
              (key) => key !== sessionKey,
            ),
          })
        } else {
          set({ pinnedSessionKeys: [...pinnedSessionKeys, sessionKey] })
        }
      },
    }),
    {
      name: 'pinned-sessions',
    },
  ),
)

export function usePinnedSessions() {
  const pinnedSessionKeys = usePinnedSessionsStore(
    (state) => state.pinnedSessionKeys,
  )
  const pin = usePinnedSessionsStore((state) => state.pin)
  const unpin = usePinnedSessionsStore((state) => state.unpin)
  const toggle = usePinnedSessionsStore((state) => state.toggle)

  const isPinned = (sessionKey: string) =>
    pinnedSessionKeys.includes(sessionKey)

  return { pinnedSessionKeys, pin, unpin, isPinned, toggle }
}
