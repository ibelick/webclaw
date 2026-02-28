import { useLayoutEffect, useRef, useState } from 'react'

export type ChatMeasurements = {
  headerRef: React.RefObject<HTMLDivElement | null>
  composerRef: React.RefObject<HTMLDivElement | null>
  workbenchRef: React.RefObject<HTMLDivElement | null>
  mainRef: React.RefObject<HTMLDivElement | null>
  pinGroupMinHeight: number
  headerHeight: number
}

export function useChatMeasurements(): ChatMeasurements {
  const headerRef = useRef<HTMLDivElement | null>(null)
  const composerRef = useRef<HTMLDivElement | null>(null)
  const workbenchRef = useRef<HTMLDivElement | null>(null)
  const mainRef = useRef<HTMLDivElement | null>(null)
  const [pinGroupMinHeight, setPinGroupMinHeight] = useState(0)
  const [headerHeight, setHeaderHeight] = useState(0)

  // Measure header/composer/workbench to keep pinned group exact.
  useLayoutEffect(() => {
    const headerEl = headerRef.current
    const composerEl = composerRef.current
    const workbenchEl = workbenchRef.current
    const mainEl = mainRef.current
    if (!mainEl) return

    const applySizes = () => {
      const nextHeaderHeight = headerEl?.offsetHeight ?? 0
      const composerHeight = composerEl?.offsetHeight ?? 0
      const workbenchHeight = workbenchEl?.offsetHeight ?? 0
      const mainHeight = mainEl.clientHeight
      mainEl.style.setProperty(
        '--chat-header-height',
        `${Math.max(0, nextHeaderHeight)}px`,
      )
      mainEl.style.setProperty(
        '--chat-composer-height',
        `${Math.max(0, composerHeight)}px`,
      )
      mainEl.style.setProperty(
        '--chat-workbench-height',
        `${Math.max(0, workbenchHeight)}px`,
      )
      setHeaderHeight(nextHeaderHeight)
      setPinGroupMinHeight(
        Math.max(0, mainHeight - nextHeaderHeight - composerHeight - workbenchHeight),
      )
    }

    applySizes()

    const observer = new ResizeObserver(() => applySizes())
    if (headerEl) observer.observe(headerEl)
    if (composerEl) observer.observe(composerEl)
    if (workbenchEl) observer.observe(workbenchEl)
    return () => observer.disconnect()
  }, [])

  return {
    headerRef,
    composerRef,
    workbenchRef,
    mainRef,
    pinGroupMinHeight,
    headerHeight,
  }
}
