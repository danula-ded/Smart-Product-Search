import { Loader2 } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

type LoaderProps = {
  label?: string
  className?: string
  sizeClassName?: string
}

export function Loader({
  label = 'Загрузка...',
  className,
  sizeClassName = 'size-4',
}: LoaderProps) {
  return (
    <div className={cn('inline-flex items-center gap-2 text-sm text-[var(--semantic-text-secondary)]', className)}>
      <Loader2 className={cn(sizeClassName, 'animate-spin text-[var(--semantic-icon-primary)]')} />
      <span>{label}</span>
    </div>
  )
}
