import * as React from 'react'

import { cn } from '@/shared/lib/utils'

export function AppContainer({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8',
        className,
      )}
      {...props}
    />
  )
}
