import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowLeft01Icon,
  Home09Icon,
  Settings01Icon,
  SidebarLeft01Icon,
} from '@hugeicons/core-free-icons'
import { AnimatePresence, motion } from 'motion/react'
import { memo, useCallback, useMemo } from 'react'
import {
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'
import { WebClawIconBig } from '@/components/icons/webclaw-big'
import { useFileExplorerState } from '../hooks/use-file-explorer-state'

type FilesSidebarProps = {
  isCollapsed: boolean
  onToggleCollapse: () => void
  onSelectAction?: () => void
}

// Check for reduced motion preference
function useReducedMotion(): boolean {
  return useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])
}

function FilesSidebarComponent({
  isCollapsed,
  onToggleCollapse,
  onSelectAction,
}: FilesSidebarProps) {
  const { navigateTo, currentPath } = useFileExplorerState()
  const reduceMotion = useReducedMotion()

  const transition = useMemo(() => ({
    duration: reduceMotion ? 0 : 0.15,
    ease: isCollapsed ? 'easeIn' : 'easeOut',
  }), [isCollapsed, reduceMotion])

  const handleNavigate = useCallback((path: string) => {
    navigateTo(path)
  }, [navigateTo])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action()
    }
  }, [])

  const quickAccessItems = useMemo(() => [
    {
      path: '/',
      icon: Home09Icon,
      label: 'Home',
      id: 'home'
    },
  ], [])

  const asideProps = useMemo(() => ({
    className: 'border-r border-primary-200 h-full overflow-hidden bg-primary-100 flex flex-col',
  }), [])

  const collapsedWidth = 48
  const expandedWidth = 300

  return (
    <motion.aside
      initial={false}
      animate={{ 
        width: reduceMotion ? (isCollapsed ? collapsedWidth : expandedWidth) : undefined,
      }}
      style={{
        width: reduceMotion ? undefined : (isCollapsed ? collapsedWidth : expandedWidth),
      }}
      transition={transition}
      className={asideProps.className}
      role="navigation"
      aria-label="File explorer navigation"
    >
      {/* Header */}
      <motion.div
        layout
        transition={{ layout: transition }}
        className={cn('flex items-center h-12 px-2 justify-between')}
      >
        <AnimatePresence initial={false}>
          {!isCollapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
            >
              <Link
                to="/new"
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  'w-full pl-1.5 justify-start',
                  'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                  'touch-manipulation'
                )}
              >
                <WebClawIconBig className="size-5 rounded-sm" aria-hidden="true" />
                <span>WebClaw</span>
              </Link>
            </motion.div>
          ) : null}
        </AnimatePresence>
        
        <TooltipProvider>
          <TooltipRoot>
            <TooltipTrigger
              onClick={onToggleCollapse}
              onKeyDown={(e) => handleKeyDown(e, onToggleCollapse)}
              render={
                <Button 
                  size="icon-sm" 
                  variant="ghost"
                  aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  className={cn(
                    'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                    'touch-manipulation'
                  )}
                >
                  <HugeiconsIcon
                    icon={SidebarLeft01Icon}
                    size={20}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </Button>
              }
            />
            <TooltipContent side="right">
              {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </TooltipContent>
          </TooltipRoot>
        </TooltipProvider>
      </motion.div>

      {/* Back to Chat Button */}
      <div className="px-2 mb-4">
        <motion.div
          layout
          transition={{ layout: transition }}
          className="w-full"
        >
          <TooltipProvider>
            <TooltipRoot>
              <TooltipTrigger asChild>
                <Link
                  to="/chat/main"
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    'w-full pl-1.5 justify-start',
                    'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                    'touch-manipulation'
                  )}
                  onClick={onSelectAction}
                >
                  <HugeiconsIcon
                    icon={ArrowLeft01Icon}
                    size={20}
                    strokeWidth={1.5}
                    className="min-w-5"
                    aria-hidden="true"
                  />
                  <AnimatePresence initial={false} mode="wait">
                    {!isCollapsed ? (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={transition}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        Back to Chat
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </Link>
              </TooltipTrigger>
              {isCollapsed ? (
                <TooltipContent side="right">
                  Back to Chat
                </TooltipContent>
              ) : null}
            </TooltipRoot>
          </TooltipProvider>
        </motion.div>
      </div>

      {/* Quick Access Section */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <AnimatePresence initial={false}>
          {!isCollapsed ? (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
              className="absolute inset-0 pt-0 flex flex-col w-[300px] min-h-0"
            >
              <div className="flex-1 min-h-0 px-2">
                <div className="mb-4">
                  <h2 className="text-sm font-medium text-primary-700 mb-3 px-1.5">
                    Quick Access
                  </h2>
                </div>
                
                <nav className="space-y-1" role="list" aria-label="Quick access folders">
                  {quickAccessItems.map((item) => (
                    <div key={item.id} role="listitem">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleNavigate(item.path)}
                        onKeyDown={(e) => handleKeyDown(e, () => handleNavigate(item.path))}
                        aria-current={currentPath === item.path ? 'page' : undefined}
                        className={cn(
                          'w-full pl-1.5 justify-start text-primary-600 hover:text-primary-900',
                          'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                          'touch-manipulation',
                          currentPath === item.path && 'bg-primary-200 text-primary-900 font-medium'
                        )}
                        aria-label={`Navigate to ${item.label}`}
                      >
                        <HugeiconsIcon
                          icon={item.icon}
                          size={20}
                          strokeWidth={1.5}
                          className="min-w-5"
                          aria-hidden="true"
                        />
                        <span className="overflow-hidden whitespace-nowrap min-w-0 truncate">
                          {item.label}
                        </span>
                      </Button>
                    </div>
                  ))}
                </nav>
              </div>
            </motion.div>
          ) : (
            // Collapsed quick access
            <motion.div
              key="collapsed-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
              className="px-2 space-y-1"
            >
              {quickAccessItems.map((item) => (
                <TooltipProvider key={item.id}>
                  <TooltipRoot>
                    <TooltipTrigger
                      onClick={() => handleNavigate(item.path)}
                      onKeyDown={(e) => handleKeyDown(e, () => handleNavigate(item.path))}
                      render={
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-current={currentPath === item.path ? 'page' : undefined}
                          aria-label={`Navigate to ${item.label}`}
                          className={cn(
                            'w-full text-primary-600 hover:text-primary-900',
                            'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                            'touch-manipulation',
                            currentPath === item.path && 'bg-primary-200 text-primary-900'
                          )}
                        >
                          <HugeiconsIcon
                            icon={item.icon}
                            size={20}
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />
                        </Button>
                      }
                    />
                    <TooltipContent side="right">
                      {item.label}
                    </TooltipContent>
                  </TooltipRoot>
                </TooltipProvider>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-primary-200 bg-primary-100">
        <motion.div
          layout
          transition={{ layout: transition }}
          className="w-full"
        >
          <TooltipProvider>
            <TooltipRoot>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={isCollapsed ? "icon-sm" : "sm"}
                  className={cn(
                    isCollapsed ? "w-full" : "w-full justify-start pl-1.5",
                    'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                    'touch-manipulation'
                  )}
                  aria-label="Settings"
                >
                  <HugeiconsIcon
                    icon={Settings01Icon}
                    size={20}
                    strokeWidth={1.5}
                    className="min-w-5"
                    aria-hidden="true"
                  />
                  <AnimatePresence initial={false} mode="wait">
                    {!isCollapsed ? (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={transition}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        Settings
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </Button>
              </TooltipTrigger>
              {isCollapsed ? (
                <TooltipContent side="right">
                  Settings
                </TooltipContent>
              ) : null}
            </TooltipRoot>
          </TooltipProvider>
        </motion.div>
      </div>
    </motion.aside>
  )
}

function areFilesSidebarPropsEqual(
  prevProps: FilesSidebarProps,
  nextProps: FilesSidebarProps,
): boolean {
  if (prevProps.isCollapsed !== nextProps.isCollapsed) return false
  return true
}

const MemoizedFilesSidebar = memo(FilesSidebarComponent, areFilesSidebarPropsEqual)

export { MemoizedFilesSidebar as FilesSidebar }