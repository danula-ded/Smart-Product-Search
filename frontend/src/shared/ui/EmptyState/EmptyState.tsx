import * as React from 'react'

import { cn } from '@/shared/lib/utils'

type EmptyStateProps = React.ComponentProps<'div'> & {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}

export function EmptyState({
  className,
  icon,
  title,
  description,
  action,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-[var(--semantic-border-default)] bg-[var(--semantic-background-section)] px-6 py-10 text-center',
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[var(--semantic-background-info)] text-[var(--semantic-icon-primary)]">
          {icon}
        </div>
      ) : null}
      <div className="text-lg font-semibold tracking-tight text-[var(--semantic-text-primary)]">{title}</div>
      {description ? (
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--semantic-text-secondary)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
