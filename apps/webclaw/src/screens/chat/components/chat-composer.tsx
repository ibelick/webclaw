import { memo, useCallback, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUp02Icon } from '@hugeicons/core-free-icons'
import type { Ref, RefObject } from 'react'

import type { AttachmentFile } from '@/components/attachment-button'
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/prompt-kit/prompt-input'
import { Button } from '@/components/ui/button'
import { AttachmentButton } from '@/components/attachment-button'
import { AttachmentPreviewList } from '@/components/attachment-preview'
import { cn } from '@/lib/utils'
import { TooltipProvider } from '@/components/ui/tooltip'

type ChatComposerProps = {
  onSubmit: (value: string, helpers: ChatComposerHelpers) => void
  isLoading: boolean
  disabled: boolean
  wrapperRef?: Ref<HTMLDivElement>
  apiRef?: RefObject<ChatComposerApi | null>
}

type ChatComposerHelpers = {
  reset: () => void
  setValue: (value: string) => void
  attachments?: Array<AttachmentFile>
}

type ChatComposerApi = {
  setValue: (value: string) => void
  appendToPrompt: (markdown: string) => void
}

function ChatComposerComponent({
  onSubmit,
  isLoading,
  disabled,
  wrapperRef,
  apiRef,
}: ChatComposerProps) {
  const [attachments, setAttachments] = useState<Array<AttachmentFile>>([])
  const promptRef = useRef<HTMLTextAreaElement | null>(null)
  const valueRef = useRef('')
  const setValueRef = useRef<((value: string) => void) | null>(null)
  const focusPrompt = useCallback(() => {
    if (typeof window === 'undefined') return
    window.requestAnimationFrame(() => {
      promptRef.current?.focus()
    })
  }, [])
  const reset = useCallback(() => {
    if (setValueRef.current) {
      setValueRef.current('')
    }
    setAttachments((prev) => {
      prev.forEach((attachment) => {
        if (attachment.preview) {
          URL.revokeObjectURL(attachment.preview)
        }
      })
      return []
    })
    focusPrompt()
  }, [focusPrompt])
  const handleFileSelect = useCallback((file: AttachmentFile) => {
    setAttachments((prev) => [...prev, file])
  }, [])
  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const removed = prev.find((attachment) => attachment.id === id)
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview)
      }
      return prev.filter((attachment) => attachment.id !== id)
    })
  }, [])
  const setComposerValue = useCallback(
    (nextValue: string) => {
      if (setValueRef.current) {
        setValueRef.current(nextValue)
      }
      focusPrompt()
    },
    [focusPrompt],
  )
  const appendToPrompt = useCallback(
    (markdown: string) => {
      const trimmedMarkdown = markdown.trim()
      if (trimmedMarkdown.length === 0) return
      const current = valueRef.current.trimEnd()
      const nextValue =
        current.length > 0 ? `${current}\n\n${trimmedMarkdown}` : trimmedMarkdown
      setComposerValue(nextValue)
    },
    [setComposerValue],
  )
  if (apiRef) {
    apiRef.current = {
      setValue: setComposerValue,
      appendToPrompt,
    }
  }
  const handleSubmit = useCallback(() => {
    if (disabled) return
    const body = valueRef.current.trim()
    // Allow submit if there's text OR valid attachments
    const validAttachments = attachments.filter((a) => !a.error && a.base64)
    if (body.length === 0 && validAttachments.length === 0) return
    onSubmit(body, {
      reset,
      setValue: setComposerValue,
      attachments: validAttachments,
    })
    focusPrompt()
  }, [disabled, focusPrompt, onSubmit, reset, setComposerValue, attachments])
  const submitDisabled = disabled

  return (
    <div
      className="mx-auto w-full max-w-full px-5 sm:max-w-[768px] sm:min-w-[400px] relative pb-3"
      ref={wrapperRef}
    >
      <TooltipProvider>
        <PromptInput
          valueRef={valueRef}
          setValueRef={setValueRef}
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
            <div className="flex items-center gap-2 min-h-8 flex-nowrap">
              <PromptInputAction
                tooltip="Attach image"
                render={(triggerProps) => (
                  <AttachmentButton
                    onFileSelect={handleFileSelect}
                    disabled={disabled}
                    buttonProps={{
                      ...triggerProps,
                      className: cn('rounded-full', triggerProps.className),
                    }}
                  />
                )}
              />
              <PromptInputAction
                tooltip="Send message"
                render={(triggerProps) => (
                  <Button
                    {...triggerProps}
                    onClick={(event) => {
                      triggerProps.onClick?.(event)
                      handleSubmit()
                    }}
                    disabled={submitDisabled || triggerProps.disabled}
                    size="icon-sm"
                    variant="default"
                    className={cn('rounded-full', triggerProps.className)}
                    aria-label="Send message"
                  >
                    <HugeiconsIcon
                      icon={ArrowUp02Icon}
                      size={20}
                      strokeWidth={1.5}
                    />
                  </Button>
                )}
              />
            </div>
          </PromptInputActions>
        </PromptInput>
      </TooltipProvider>
    </div>
  )
}

const MemoizedChatComposer = memo(ChatComposerComponent)

export { MemoizedChatComposer as ChatComposer }
export type { ChatComposerApi, ChatComposerHelpers }
