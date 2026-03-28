import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { ChatWorkbench } from '@/screens/chat/components/chat-workbench'

export const Route = createFileRoute('/dev/table-block')({
  component: RouteComponent,
})

function RouteComponent() {
  const [promptValue, setPromptValue] = useState('')

  return (
    <main className="min-h-screen bg-surface text-primary-900">
      <div className="mx-auto max-w-[960px] px-5 py-6">
        <h1 className="text-xl font-medium text-primary-900">Table Block E2E</h1>
        <p className="mt-1 text-sm text-primary-700">
          Dev page for browser-level table block verification.
        </p>
      </div>

      <ChatWorkbench
        sessionKey="dev-table-block-e2e"
        onInsertToPrompt={(markdown) => {
          const trimmed = markdown.trim()
          if (trimmed.length === 0) return
          setPromptValue((prev) =>
            prev.trim().length > 0 ? `${prev.trimEnd()}\n\n${trimmed}` : trimmed,
          )
        }}
      />

      <div className="mx-auto max-w-[960px] px-5 pb-6">
        <label className="block text-sm font-medium text-primary-900" htmlFor="prompt-target">
          Prompt Target
        </label>
        <textarea
          id="prompt-target"
          data-testid="prompt-target"
          className="mt-2 h-36 w-full rounded-lg border border-primary-200 bg-surface px-3 py-2 text-sm text-primary-900"
          readOnly
          value={promptValue}
        />
      </div>
    </main>
  )
}
