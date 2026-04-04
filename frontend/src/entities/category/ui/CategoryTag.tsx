import { AppBadge } from '@/shared/ui'

type CategoryTagProps = {
  children: string
  tone?: 'info' | 'accent' | 'outline'
}

export function CategoryTag({ children, tone = 'info' }: CategoryTagProps) {
  return <AppBadge tone={tone}>{children}</AppBadge>
}
