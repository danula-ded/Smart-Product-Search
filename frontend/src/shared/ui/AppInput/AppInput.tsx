import * as React from 'react'

import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/primitives'

type AppInputProps = React.ComponentProps<typeof Input> & {
  label?: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode
  startIcon?: React.ReactNode
  endAdornment?: React.ReactNode
  containerClassName?: string
}

export const AppInput = React.forwardRef<HTMLInputElement, AppInputProps>(
  (
    {
      className,
      containerClassName,
      label,
      hint,
      error,
      startIcon,
      endAdornment,
      id,
      ...props
    },
    ref,
  ) => {
    return (
      <label className={cn('grid gap-2', containerClassName)} htmlFor={id}>
        {label ? <span className="text-sm font-medium text-[var(--semantic-text-primary)]">{label}</span> : null}
        <span className="relative block">
          {startIcon ? (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--semantic-icon-primary)]">
              {startIcon}
            </span>
          ) : null}
          <Input
            ref={ref}
            id={id}
            className={cn(startIcon ? 'pl-10' : '', endAdornment ? 'pr-12' : '', className)}
            {...props}
          />
          {endAdornment ? (
            <span className="absolute inset-y-0 right-3 flex items-center text-[var(--semantic-text-muted)]">
              {endAdornment}
            </span>
          ) : null}
        </span>
        {error ? (
          <span className="text-xs font-medium text-[var(--semantic-status-danger)]">{error}</span>
        ) : hint ? (
          <span className="text-xs text-[var(--semantic-text-muted)]">{hint}</span>
        ) : null}
      </label>
    )
  },
)

AppInput.displayName = 'AppInput'
