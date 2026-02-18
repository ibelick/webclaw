import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  Cancel01Icon,
  CommandIcon,
  QuestionMarkIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type ShortcutItem = {
  keys: Array<string>
  description: string
  icon?: typeof CommandIcon
}

const SHORTCUTS: Array<ShortcutItem> = [
  {
    keys: ['Mod', 'K'],
    description: 'Search sessions',
    icon: Search01Icon,
  },
  {
    keys: ['Mod', 'Shift', 'O'],
    description: 'Create new session',
    icon: Add01Icon,
  },
]

type KeyboardShortcutsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatKey(key: string): string {
  if (key === 'Mod') {
    return typeof navigator !== 'undefined' && navigator.platform.includes('Mac')
      ? '⌘'
      : 'Ctrl'
  }
  return key
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-primary-200">
          <DialogTitle className="text-base font-medium text-primary-900 flex items-center gap-2">
            <HugeiconsIcon
              icon={CommandIcon}
              size={20}
              strokeWidth={1.5}
              className="text-primary-600"
            />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogClose asChild>
            <Button size="icon-sm" variant="ghost" className="shrink-0">
              <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.5} />
            </Button>
          </DialogClose>
        </div>

        <DialogDescription className="sr-only">
          List of available keyboard shortcuts for WebClaw
        </DialogDescription>

        <div className="px-6 py-4">
          <div className="space-y-3">
            {SHORTCUTS.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  {shortcut.icon && (
                    <HugeiconsIcon
                      icon={shortcut.icon}
                      size={18}
                      strokeWidth={1.5}
                      className="text-primary-500"
                    />
                  )}
                  <span className="text-sm text-primary-800">
                    {shortcut.description}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, keyIndex) => (
                    <span key={keyIndex} className="flex items-center">
                      <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 text-xs font-medium text-primary-700 bg-primary-100 border border-primary-200 rounded">
                        {formatKey(key)}
                      </kbd>
                      {keyIndex < shortcut.keys.length - 1 && (
                        <span className="mx-1 text-xs text-primary-400">+</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 bg-primary-50 border-t border-primary-100">
          <p className="text-xs text-primary-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-primary-100 border border-primary-200 rounded text-[10px]">?</kbd> anytime to show this dialog
          </p>
        </div>
      </DialogContent>
    </DialogRoot>
  )
}
