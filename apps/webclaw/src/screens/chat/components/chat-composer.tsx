import { memo, useCallback, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUp02Icon, Attachment01Icon, Cancel01Icon } from '@hugeicons/core-free-icons'
import type { Ref } from 'react'

import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/prompt-kit/prompt-input'
import { Button } from '@/components/ui/button'
import { compressImage, isImageFile } from '@/lib/image-compress'

type CompressedAttachment = {
  mimeType: string
  content: string
  preview: string // data URL for preview
  name: string
}

type ChatComposerProps = {
  onSubmit: (
    value: string,
    helpers: ChatComposerHelpers,
    attachments?: Array<{ mimeType: string; content: string }>,
  ) => void
  isLoading: boolean
  disabled: boolean
  wrapperRef?: Ref<HTMLDivElement>
}

type ChatComposerHelpers = {
  reset: () => void
  setValue: (value: string) => void
}

function ChatComposerComponent({
  onSubmit,
  isLoading,
  disabled,
  wrapperRef,
}: ChatComposerProps) {
  const [value, setValue] = useState('')
  const [attachments, setAttachments] = useState<Array<CompressedAttachment>>([])
  const [compressing, setCompressing] = useState(false)
  const promptRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
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
  const setComposerValue = useCallback(
    (nextValue: string) => {
      setValue(nextValue)
      focusPrompt()
    },
    [focusPrompt],
  )

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(isImageFile)
    if (imageFiles.length === 0) return
    setCompressing(true)
    try {
      const compressed = await Promise.all(
        imageFiles.map(async (file) => {
          const result = await compressImage(file)
          return {
            ...result,
            preview: `data:${result.mimeType};base64,${result.content}`,
            name: file.name,
          }
        }),
      )
      setAttachments((prev) => [...prev, ...compressed])
    } finally {
      setCompressing(false)
    }
  }, [])

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSubmit = useCallback(() => {
    if (disabled) return
    const body = value.trim()
    if (body.length === 0 && attachments.length === 0) return
    const atts =
      attachments.length > 0
        ? attachments.map((a) => ({ mimeType: a.mimeType, content: a.content }))
        : undefined
    onSubmit(body || '(image)', { reset, setValue: setComposerValue }, atts)
    focusPrompt()
  }, [
    disabled,
    focusPrompt,
    onSubmit,
    reset,
    setComposerValue,
    value,
    attachments,
  ])

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      const imageFiles: File[] = []
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) imageFiles.push(file)
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault()
        addFiles(imageFiles)
      }
    },
    [addFiles],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer?.files) {
        addFiles(e.dataTransfer.files)
      }
    },
    [addFiles],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const submitDisabled =
    disabled || (value.trim().length === 0 && attachments.length === 0)

  return (
    <div
      className="mx-auto w-full max-w-full px-5 sm:max-w-[768px] sm:min-w-[400px] relative pb-3"
      ref={wrapperRef}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {attachments.map((att, i) => (
            <div key={i} className="relative group">
              <img
                src={att.preview}
                alt={att.name}
                className="h-16 w-16 object-cover rounded-lg border border-primary-200"
              />
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                className="absolute -top-1.5 -right-1.5 bg-primary-800 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Remove ${att.name}`}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
              </button>
            </div>
          ))}
          {compressing && (
            <div className="h-16 w-16 flex items-center justify-center rounded-lg border border-primary-200 bg-primary-50">
              <span className="text-xs text-primary-500">…</span>
            </div>
          )}
        </div>
      )}

      <PromptInput
        value={value}
        onValueChange={setValue}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        disabled={disabled}
      >
        <PromptInputTextarea
          placeholder="Type a message…"
          inputRef={promptRef}
          onPaste={handlePaste}
        />
        <PromptInputActions className="justify-end px-3">
          <PromptInputAction tooltip="Attach image">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              size="icon-sm"
              variant="ghost"
              className="text-primary-500 hover:text-primary-700"
              aria-label="Attach image"
            >
              <HugeiconsIcon
                icon={Attachment01Icon}
                size={18}
                strokeWidth={1.6}
              />
            </Button>
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
        </PromptInputActions>
      </PromptInput>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}

const MemoizedChatComposer = memo(ChatComposerComponent)

export { MemoizedChatComposer as ChatComposer }
export type { ChatComposerHelpers }
