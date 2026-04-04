import * as React from 'react'

import { cn } from '@/shared/lib/utils'

type SectionTitleProps = {
  title: React.ReactNode
  description?: React.ReactNode
  badge?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function SectionTitle({
  title,
  description,
  badge,
  action,
  className,
}: SectionTitleProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="space-y-2">
        {badge ? <div>{badge}</div> : null}
        <div className="text-xl font-semibold tracking-tight text-[var(--semantic-text-primary)]">{title}</div>
        {description ? (
          <div className="max-w-[72ch] text-sm leading-6 text-[var(--semantic-text-secondary)]">
            {description}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
