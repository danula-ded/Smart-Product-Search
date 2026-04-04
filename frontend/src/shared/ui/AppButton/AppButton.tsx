import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/primitives'

const appButtonVariants = cva('', {
  variants: {
    variant: {
      primary: '',
      secondary: '',
      accent:
        'border-[var(--semantic-border-accent)] bg-[var(--semantic-button-accent)] text-[var(--semantic-text-primary)] hover:bg-[var(--semantic-button-accent-hover)]',
      outline: '',
      ghost: '',
      danger: '',
    },
    size: {
      md: '',
      sm: '',
      lg: '',
      icon: '',
      'icon-sm': '',
    },
    stretch: {
      true: 'w-full',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
    stretch: false,
  },
})

const variantMap = {
  primary: 'default',
  secondary: 'secondary',
  accent: 'default',
  outline: 'outline',
  ghost: 'ghost',
  danger: 'destructive',
} as const

const sizeMap = {
  md: 'default',
  sm: 'sm',
  lg: 'lg',
  icon: 'icon',
  'icon-sm': 'icon-sm',
} as const

type AppButtonProps = Omit<React.ComponentProps<typeof Button>, 'variant' | 'size'> &
  VariantProps<typeof appButtonVariants>

export function AppButton({
  className,
  variant = 'primary',
  size = 'md',
  stretch = false,
  ...props
}: AppButtonProps) {
  return (
    <Button
      variant={variantMap[variant ?? 'primary']}
      size={sizeMap[size ?? 'md']}
      className={cn(appButtonVariants({ variant, size, stretch }), className)}
      {...props}
    />
  )
}
