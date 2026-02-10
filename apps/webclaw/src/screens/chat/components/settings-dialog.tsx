import { HugeiconsIcon } from '@hugeicons/react'
import {
  Cancel01Icon,
  ComputerIcon,
  Moon01Icon,
  Sun01Icon,
} from '@hugeicons/core-free-icons'
import type { PathsPayload } from '../types'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTab } from '@/components/ui/tabs'
import { useChatSettings } from '@/hooks/use-chat-settings'
import type { ThemeMode, TextSize } from '@/hooks/use-chat-settings'
import { Button } from '@/components/ui/button'

type SettingsSectionProps = {
  title: string
  children: React.ReactNode
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div className="border-b border-primary-200 py-4 last:border-0">
      <h3 className="mb-3 text-sm font-medium text-primary-900">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

type SettingsRowProps = {
  label: string
  description?: string
  children: React.ReactNode
}

function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1 select-none">
        <div className="text-sm text-primary-800">{label}</div>
        {description && (
          <div className="text-xs text-primary-500">{description}</div>
        )}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pathsLoading: boolean
  pathsError: string | null
  paths: PathsPayload | null
  onClose: () => void
  onCopySessionsDir: () => void
  onCopyStorePath: () => void
}

export function SettingsDialog({
  open,
  onOpenChange,
  onClose,
}: SettingsDialogProps) {
  const { settings, updateSettings } = useChatSettings()
  const themeOptions = [
    { value: 'system', label: 'System', icon: ComputerIcon },
    { value: 'light', label: 'Light', icon: Sun01Icon },
    { value: 'dark', label: 'Dark', icon: Moon01Icon },
  ] as const
  const textSizeOptions = [
    { value: 'sm', label: 'S' },
    { value: 'md', label: 'M' },
    { value: 'lg', label: 'L' },
    { value: 'xl', label: 'XL' },
  ] as const
  function applyTheme(theme: ThemeMode) {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    root.classList.remove('light', 'dark', 'system')
    root.classList.add(theme)
    if (theme === 'system' && media.matches) {
      root.classList.add('dark')
    }
  }

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(480px,92vw)] max-h-[80vh] overflow-auto">
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="mb-1">Settings</DialogTitle>
              <DialogDescription className="hidden">
                Configure WebClaw
              </DialogDescription>
            </div>
            <DialogClose
              render={
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-primary-500 hover:bg-primary-100 hover:text-primary-700"
                  aria-label="Close"
                >
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    size={20}
                    strokeWidth={1.5}
                  />
                </Button>
              }
            />
          </div>

          <SettingsSection title="Connection">
            <SettingsRow label="Status">
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <span className="size-2 rounded-full bg-green-500" />
                Connected
              </span>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="Appearance">
            <SettingsRow label="Theme">
              <Tabs
                value={settings.theme}
                onValueChange={(value) => {
                  const theme = value as ThemeMode
                  applyTheme(theme)
                  updateSettings({ theme })
                }}
              >
                <TabsList
                  variant="default"
                  className="gap-2 *:data-[slot=tab-indicator]:duration-0"
                >
                  {themeOptions.map((option) => (
                    <TabsTab key={option.value} value={option.value}>
                      <HugeiconsIcon
                        icon={option.icon}
                        size={20}
                        strokeWidth={1.5}
                      />
                      <span>{option.label}</span>
                    </TabsTab>
                  ))}
                </TabsList>
              </Tabs>
            </SettingsRow>
            <SettingsRow label="Text size">
              <Tabs
                value={settings.textSize}
                onValueChange={(value) => {
                  updateSettings({ textSize: value as TextSize })
                }}
              >
                <TabsList
                  variant="default"
                  className="gap-2 *:data-[slot=tab-indicator]:duration-0"
                >
                  {textSizeOptions.map((option) => (
                    <TabsTab key={option.value} value={option.value}>
                      <span>{option.label}</span>
                    </TabsTab>
                  ))}
                </TabsList>
              </Tabs>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="Chat">
            <SettingsRow label="Show tool messages">
              <Switch
                checked={settings.showToolMessages}
                onCheckedChange={(checked) =>
                  updateSettings({ showToolMessages: checked })
                }
              />
            </SettingsRow>
            <SettingsRow label="Show reasoning blocks">
              <Switch
                checked={settings.showReasoningBlocks}
                onCheckedChange={(checked) =>
                  updateSettings({ showReasoningBlocks: checked })
                }
              />
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="About">
            <div className="text-sm text-primary-800">WebClaw (beta)</div>
            <div className="flex gap-4 pt-2">
              <a
                href="https://webclaw.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:text-primary-900 hover:underline"
              >
                Website
              </a>
              <a
                href="https://github.com/ibelick/webclaw"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:text-primary-900 hover:underline"
              >
                GitHub
              </a>
              <a
                href="https://docs.openclaw.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:text-primary-900 hover:underline"
              >
                OpenClaw docs
              </a>
            </div>
          </SettingsSection>

          <div className="mt-6 flex justify-end">
            <DialogClose onClick={onClose}>Close</DialogClose>
          </div>
        </div>
      </DialogContent>
    </DialogRoot>
  )
}
