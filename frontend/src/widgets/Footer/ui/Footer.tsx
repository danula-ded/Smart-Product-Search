import type { Health } from '@/shared/api'
import { AppBadge, AppCard, AppCardContent, AppLink } from '@/shared/ui'

type FooterProps = {
  health: Health | null
}

export function Footer({ health }: FooterProps) {
  return (
    <AppCard className="mt-2">
      <AppCardContent className="flex flex-col gap-3 py-1 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-[var(--semantic-text-primary)]">
            Smart Product Search Frontend
          </div>
          <div className="text-sm text-[var(--semantic-text-secondary)]">
            Brand-driven UI, FSD architecture and reusable design system tokens.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AppBadge tone={health?.status === 'healthy' ? 'accent' : 'danger'}>
            {health?.status ?? 'offline'}
          </AppBadge>
          <AppBadge tone="outline">backend {health?.version ?? 'n/a'}</AppBadge>
          <AppLink href="#top">Наверх</AppLink>
        </div>
      </AppCardContent>
    </AppCard>
  )
}
