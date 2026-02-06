import { useEffect } from 'react'

type UseKeyboardShortcutsInput = {
  onSearchCurrent: () => void
  onSearchGlobal: () => void
  onNewChat: () => void
}

export function useKeyboardShortcuts({
  onSearchCurrent,
  onSearchGlobal,
  onNewChat,
}: UseKeyboardShortcutsInput) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return
      const isModifier = event.metaKey || event.ctrlKey
      if (!isModifier) return

      const key = event.key.toLowerCase()
      if (key === 'f' && event.shiftKey) {
        event.preventDefault()
        onSearchGlobal()
        return
      }
      if (key === 'f') {
        event.preventDefault()
        onSearchCurrent()
        return
      }
      if (key === 'k') {
        event.preventDefault()
        onNewChat()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNewChat, onSearchCurrent, onSearchGlobal])
}
