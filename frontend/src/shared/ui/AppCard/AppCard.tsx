import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/shared/lib/utils'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/primitives'

const appCardVariants = cva('', {
  variants: {
    tone: {
      default: '',
      info:
        'border-[var(--semantic-border-default)] bg-[var(--semantic-background-info)]',
      accent:
        'border-[var(--semantic-border-accent)] bg-[var(--semantic-background-accent)]',
      highlight:
        'border-[var(--semantic-border-default)] bg-[var(--semantic-background-highlight)]',
    },
  },
  defaultVariants: {
    tone: 'default',
  },
})

type AppCardProps = React.ComponentProps<typeof Card> & VariantProps<typeof appCardVariants>

export function AppCard({ className, tone = 'default', ...props }: AppCardProps) {
  return <Card className={cn(appCardVariants({ tone }), className)} {...props} />
}

export const AppCardHeader = CardHeader
export const AppCardTitle = CardTitle
export const AppCardDescription = CardDescription
export const AppCardContent = CardContent
export const AppCardFooter = CardFooter
export const AppCardAction = CardAction
