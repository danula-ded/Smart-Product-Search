import * as React from 'react'

import { cn } from '@/shared/lib/utils'

export function AppLink({ className, ...props }: React.ComponentProps<'a'>) {
  return (
    <a
      className={cn(
        'inline-flex items-center gap-2 font-medium text-[var(--semantic-link-primary)] underline-offset-4 transition-colors hover:text-[var(--semantic-link-hover)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus-ring)]',
        className,
      )}
      {...props}
    />
  )
}
