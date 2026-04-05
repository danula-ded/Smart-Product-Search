import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/primitives'

const appBadgeVariants = cva('', {
  variants: {
    tone: {
      primary: '',
      info: '',
      accent:
        'border-[var(--semantic-border-accent)] bg-[var(--semantic-background-accent)] text-[var(--semantic-status-success)]',
      outline: '',
      subtle:
        'border-transparent bg-[var(--semantic-background-section)] text-[var(--semantic-text-secondary)]',
      danger: '',
    },
  },
  defaultVariants: {
    tone: 'primary',
  },
})

const primitiveVariantMap = {
  primary: 'default',
  info: 'secondary',
  accent: 'secondary',
  outline: 'outline',
  subtle: 'ghost',
  danger: 'destructive',
} as const

type AppBadgeProps = Omit<React.ComponentProps<typeof Badge>, 'variant'> &
  VariantProps<typeof appBadgeVariants>

export function AppBadge({ className, tone = 'primary', ...props }: AppBadgeProps) {
  return (
    <Badge
      variant={primitiveVariantMap[tone ?? 'primary']}
      className={cn(appBadgeVariants({ tone }), className)}
      {...props}
    />
  )
}
