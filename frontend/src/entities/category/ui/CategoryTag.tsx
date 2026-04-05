import { cn } from '@/shared/lib/utils'
import { AppBadge } from '@/shared/ui'

type CategoryTagProps = {
  children: string
  tone?: 'info' | 'accent' | 'outline'
  className?: string
}

export function CategoryTag({ children, tone = 'info', className }: CategoryTagProps) {
  return (
    <AppBadge tone={tone} className={cn('min-w-0 max-w-full', className)} title={children}>
      <span className="truncate">{children}</span>
    </AppBadge>
  )
}
