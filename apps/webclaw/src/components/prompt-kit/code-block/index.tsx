import { useEffect, useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Copy01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import type { HighlighterCore } from 'shiki/core'
import vitesseDark from '@shikijs/themes/vitesse-dark'
import vitesseLight from '@shikijs/themes/vitesse-light'
import langBash from '@shikijs/langs/bash'
import langC from '@shikijs/langs/c'
import langCpp from '@shikijs/langs/cpp'
import langCsharp from '@shikijs/langs/csharp'
import langCss from '@shikijs/langs/css'
import langDiff from '@shikijs/langs/diff'
import langDockerfile from '@shikijs/langs/dockerfile'
import langGo from '@shikijs/langs/go'
import langGraphql from '@shikijs/langs/graphql'
import langHtml from '@shikijs/langs/html'
import langJava from '@shikijs/langs/java'
import langJavascript from '@shikijs/langs/javascript'
import langJson from '@shikijs/langs/json'
import langJsx from '@shikijs/langs/jsx'
import langKotlin from '@shikijs/langs/kotlin'
import langMarkdown from '@shikijs/langs/markdown'
import langPhp from '@shikijs/langs/php'
import langPython from '@shikijs/langs/python'
import langRegexp from '@shikijs/langs/regexp'
import langRuby from '@shikijs/langs/ruby'
import langRust from '@shikijs/langs/rust'
import langShell from '@shikijs/langs/shell'
import langSql from '@shikijs/langs/sql'
import langSwift from '@shikijs/langs/swift'
import langToml from '@shikijs/langs/toml'
import langTypescript from '@shikijs/langs/typescript'
import langTsx from '@shikijs/langs/tsx'
import langXml from '@shikijs/langs/xml'
import langYaml from '@shikijs/langs/yaml'
import { useResolvedTheme, useChatSettingsStore, TEXT_SIZE_CLASSES } from '@/hooks/use-chat-settings'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { formatLanguageName, normalizeLanguage, resolveLanguage } from './utils'

type CodeBlockProps = {
  content: string
  ariaLabel?: string
  language?: string
  className?: string
}

let highlighterPromise: Promise<HighlighterCore> | null = null

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [vitesseLight, vitesseDark],
      langs: [
        langJavascript,
        langTypescript,
        langTsx,
        langJsx,
        langPython,
        langBash,
        langShell,
        langJson,
        langYaml,
        langToml,
        langMarkdown,
        langHtml,
        langCss,
        langSql,
        langRust,
        langGo,
        langJava,
        langKotlin,
        langSwift,
        langRuby,
        langPhp,
        langC,
        langCpp,
        langCsharp,
        langDockerfile,
        langDiff,
        langGraphql,
        langRegexp,
        langXml,
      ],
      engine: createJavaScriptRegexEngine(),
    })
  }
  return highlighterPromise
}

export function CodeBlock({
  content,
  ariaLabel,
  language = 'text',
  className,
}: CodeBlockProps) {
  const resolvedTheme = useResolvedTheme()
  const textSize = useChatSettingsStore((s) => s.settings.textSize)
  const codeSizeClass = TEXT_SIZE_CLASSES[textSize]
  const [copied, setCopied] = useState(false)
  const [html, setHtml] = useState<string | null>(null)
  const [resolvedLanguage, setResolvedLanguage] = useState('text')
  const [headerBg, setHeaderBg] = useState<string | undefined>()

  const fallback = useMemo(() => {
    return content
  }, [content])

  const normalizedLanguage = normalizeLanguage(language || 'text')
  const themeName = resolvedTheme === 'dark' ? 'vitesse-dark' : 'vitesse-light'

  useEffect(() => {
    let active = true
    getHighlighter()
      .then((highlighter) => {
        const lang = resolveLanguage(normalizedLanguage)
        const highlighted = highlighter.codeToHtml(content, {
          lang,
          theme: themeName,
        })
        if (active) {
          setResolvedLanguage(lang)
          setHtml(highlighted)
          const theme = highlighter.getTheme(themeName)
          setHeaderBg(theme.bg)
        }
      })
      .catch(() => {
        if (active) setHtml(null)
      })
    return () => {
      active = false
    }
  }, [content, normalizedLanguage, themeName])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const isSingleLine = content.split('\n').length === 1
  const displayLanguage = formatLanguageName(resolvedLanguage)

  return (
    <div
      className={cn(
        'group relative min-w-0 overflow-hidden rounded-lg border border-primary-200',
        className,
      )}
    >
      <div
        className={cn('flex items-center justify-between px-3 pt-2')}
        style={{ backgroundColor: headerBg }}
      >
        <span className="text-xs font-medium text-primary-500">
          {displayLanguage}
        </span>
        <Button
          variant="ghost"
          aria-label={ariaLabel ?? 'Copy code'}
          className="h-auto px-0 text-xs font-medium text-primary-500 hover:text-primary-800 hover:bg-transparent"
          onClick={() => {
            handleCopy().catch(() => {})
          }}
        >
          <HugeiconsIcon
            icon={copied ? Tick02Icon : Copy01Icon}
            size={14}
            strokeWidth={1.8}
          />
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      {html ? (
        <div
          className={cn(
            codeSizeClass,
            'text-primary-900 [&>pre]:overflow-x-auto',
            isSingleLine
              ? '[&>pre]:whitespace-pre [&>pre]:px-3 [&>pre]:py-2'
              : '[&>pre]:px-3 [&>pre]:py-3',
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre
          className={cn(
            codeSizeClass,
            isSingleLine ? 'whitespace-pre px-3 py-2' : 'px-3 py-3',
          )}
        >
          <code className="overflow-x-auto">{fallback}</code>
        </pre>
      )}
    </div>
  )
}
