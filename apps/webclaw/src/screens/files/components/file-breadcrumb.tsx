import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon, Home02Icon } from '@hugeicons/core-free-icons'
import { useCallback } from 'react'
import { useFileExplorerState } from '../hooks/use-file-explorer-state'
import { cn } from '@/lib/utils'

interface FileBreadcrumbProps {
  path: string
}

export function FileBreadcrumb({ path }: FileBreadcrumbProps) {
  const { navigateTo } = useFileExplorerState()
  
  const segments = path === '/' ? [] : path.split('/').filter(Boolean)
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    ...segments.map((segment, index) => ({
      name: segment,
      path: '/' + segments.slice(0, index + 1).join('/'),
    })),
  ]

  const handleNavigate = useCallback((breadcrumbPath: string) => {
    navigateTo(breadcrumbPath)
  }, [navigateTo])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, breadcrumbPath: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      navigateTo(breadcrumbPath)
    }
  }, [navigateTo])

  return (
    <nav aria-label="File navigation" className="text-sm text-primary-600">
      <ol className="flex items-center gap-1">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.path} className="flex items-center gap-1">
            {index > 0 ? (
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={16}
                strokeWidth={1.5}
                className="text-primary-400"
                aria-hidden="true"
              />
            ) : null}
            <button
              type="button"
              onClick={() => handleNavigate(crumb.path)}
              onKeyDown={(e) => handleKeyDown(e, crumb.path)}
              aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-1',
                'transition-colors duration-150 ease-out',
                'hover:bg-primary-100 hover:text-primary-900',
                'focus-visible:bg-primary-100 focus-visible:text-primary-900',
                'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                'touch-manipulation',
                index === breadcrumbs.length - 1
                  ? 'text-primary-900 font-medium'
                  : 'text-primary-600'
              )}
            >
              {index === 0 ? (
                <HugeiconsIcon
                  icon={Home02Icon}
                  size={16}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              ) : null}
              <span className="whitespace-nowrap">{crumb.name}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}