import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassValue } from 'clsx'

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

export function randomUUID() {
  // Prefer native randomUUID (requires Secure Context: HTTPS or localhost)
  if (
    typeof window !== 'undefined' &&
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    window.crypto &&
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    window.crypto.randomUUID
  ) {
    return window.crypto.randomUUID()
  }

  // Fallback using crypto.getRandomValues (available in all contexts including HTTP)
  if (
    typeof crypto !== 'undefined' &&
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    crypto.getRandomValues
  ) {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    // Set version 4 (0100) and variant 10xx per RFC 4122
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
      '',
    )
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  // Last-resort fallback for environments without crypto support
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
