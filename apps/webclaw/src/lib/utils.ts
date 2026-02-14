import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassValue } from 'clsx'

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

export function randomUUID() {
  // Check if we're in a secure context with crypto.randomUUID available
  if (
    typeof window !== 'undefined' &&
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    window.crypto &&
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    window.crypto.randomUUID
  ) {
    return window.crypto.randomUUID()
  }

  // Fallback for insecure contexts (e.g. HTTP on LAN)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
