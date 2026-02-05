import { memo, useCallback, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUp02Icon } from '@hugeicons/core-free-icons'
import type { Ref } from 'react'

import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/prompt-kit/prompt-input'
import { Button } from '@/components/ui/button'
import { AttachmentButton, type AttachmentFile } from '@/components/attachment-button'
import { AttachmentPreviewList } from '@/components/attachment-preview'

type ChatComposerProps = {
  onSubmit: (value: string, helpers: ChatComposerHelpers) => void
  isLoading: boolean
  disabled: boolean
  wrapperRef?: Ref<HTMLDivElement>
}

type ChatComposerHelpers = {
  reset: () => void
  setValue: (value: string) => void
  attachments?: AttachmentFile[]
}

function ChatComposerComponent({
  onSubmit,
  isLoading,
  disabled,
  wrapperRef,
}: ChatComposerProps) {
  const [value, setValue] = useState('')
  const [attachments, setAttachments] = useState<AttachmentFile[]>([])
  const promptRef = useRef<HTMLTextAreaElement | null>(null)
  const focusPrompt = useCallback(() => {
    if (typeof window === 'undefined') return
    window.requestAnimationFrame(() => {
      promptRef.current?.focus()
    })
  }, [])
  const reset = useCallback(() => {
    setValue('')
    setAttachments([])
    focusPrompt()
  }, [focusPrompt])
  const handleFileSelect = useCallback((file: AttachmentFile) => {
    setAttachments((prev) => [...prev, file])
  }, [])
  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])
  const setComposerValue = useCallback(
    (nextValue: string) => {
      setValue(nextValue)
      focusPrompt()
    },
    [focusPrompt],
  )
  const handleSubmit = useCallback(() => {
    if (disabled) return
    const body = value.trim()
    // Allow submit if there's text OR valid attachments
    const validAttachments = attachments.filter((a) => !a.error && a.base64)
    if (body.length === 0 && validAttachments.length === 0) return
    onSubmit(body, { reset, setValue: setComposerValue, attachments: validAttachments })
    focusPrompt()
  }, [disabled, focusPrompt, onSubmit, reset, setComposerValue, value, attachments])
  const validAttachments = attachments.filter((a) => !a.error && a.base64)
  const submitDisabled = disabled || (value.trim().length === 0 && validAttachments.length === 0)

  return (
    <div
      className="mx-auto w-full max-w-full px-5 sm:max-w-[768px] sm:min-w-[400px] relative pb-3"
      ref={wrapperRef}
    >
      <PromptInput
        value={value}
        onValueChange={setValue}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        disabled={disabled}
      >
        <AttachmentPreviewList
          attachments={attachments}
          onRemove={handleRemoveAttachment}
        />
        <PromptInputTextarea
          placeholder="Type a message…"
          inputRef={promptRef}
        />
        <PromptInputActions className="justify-end px-3">
          <div className="flex items-center gap-1">
            <PromptInputAction tooltip="Attach image">
              <AttachmentButton
                onFileSelect={handleFileSelect}
                disabled={disabled}
              />
            </PromptInputAction>
            <PromptInputAction tooltip="Send message">
              <Button
                onClick={handleSubmit}
                disabled={submitDisabled}
                size="icon-sm"
                className="rounded-full"
                aria-label="Send message"
              >
                <HugeiconsIcon icon={ArrowUp02Icon} size={18} strokeWidth={2} />
              </Button>
            </PromptInputAction>
          </div>
        </PromptInputActions>
      </PromptInput>
    </div>
  )
}

const MemoizedChatComposer = memo(ChatComposerComponent)

export { MemoizedChatComposer as ChatComposer }
export type { ChatComposerHelpers }
