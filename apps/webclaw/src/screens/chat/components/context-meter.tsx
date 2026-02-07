import { memo, useMemo } from 'react'
import { cn } from '@/lib/utils'

type ContextMeterProps = {
  usedTokens?: number
  maxTokens?: number
  className?: string
}

function ContextMeterComponent({
  usedTokens,
  maxTokens,
  className,
}: ContextMeterProps) {
  const { percentage, color, label } = useMemo(() => {
    if (!usedTokens || !maxTokens) return { percentage: 0, color: '', label: '' }
    const pct = Math.min((usedTokens / maxTokens) * 100, 100)
    const fmt = (n: number) =>
      n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n)
    return {
      percentage: pct,
      color:
        pct >= 90
          ? 'bg-red-500'
          : pct >= 70
            ? 'bg-yellow-500'
            : 'bg-green-500',
      label: `${fmt(usedTokens)} / ${fmt(maxTokens)} tokens (${pct.toFixed(0)}%)`,
    }
  }, [usedTokens, maxTokens])

  if (!usedTokens || !maxTokens || percentage === 0) return null

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs text-primary-500',
        className,
      )}
      title={label}
    >
      <div className="w-20 h-1.5 bg-primary-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            color,
            percentage >= 95 && 'animate-pulse',
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="tabular-nums whitespace-nowrap">
        {percentage.toFixed(0)}%
      </span>
    </div>
  )
}

export const ContextMeter = memo(ContextMeterComponent)
