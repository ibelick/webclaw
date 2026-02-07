import { useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'system' | 'light' | 'dark'
export type TextSize = 'sm' | 'md' | 'lg' | 'xl'

export const textSizeClasses: Record<TextSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
}

export type ChatSettings = {
  showToolMessages: boolean
  showReasoningBlocks: boolean
  theme: ThemeMode
  textSize: TextSize
}

type ChatSettingsState = {
  settings: ChatSettings
  updateSettings: (updates: Partial<ChatSettings>) => void
}

export const useChatSettingsStore = create<ChatSettingsState>()(
  persist(
    (set) => ({
      settings: {
        showToolMessages: true,
        showReasoningBlocks: true,
        theme: 'system',
        textSize: 'md',
      },
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
    }),
    {
      name: 'chat-settings',
    },
  ),
)

export function useChatSettings() {
  const settings = useChatSettingsStore((state) => state.settings)
  const updateSettings = useChatSettingsStore((state) => state.updateSettings)

  return {
    settings,
    updateSettings,
  }
}

export function useResolvedTheme() {
  const theme = useChatSettingsStore((state) => state.settings.theme)
  const [systemIsDark, setSystemIsDark] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemIsDark(media.matches)
    function handleChange(event: MediaQueryListEvent) {
      setSystemIsDark(event.matches)
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  return useMemo(() => {
    if (theme === 'dark') return 'dark'
    if (theme === 'light') return 'light'
    return systemIsDark ? 'dark' : 'light'
  }, [theme, systemIsDark])
}
