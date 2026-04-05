import type { Health } from '@/shared/api'
import { AppBadge, AppButton, AppCard, AppCardContent, AppLink } from '@/shared/ui'

type HeaderProps = {
  health: Health | null
  loadingData: boolean
  onRefresh: () => void
}

export function Header({ health, loadingData, onRefresh }: HeaderProps) {
  return (
    <AppCard tone="info" className="brand-shell">
      <AppCardContent className="flex flex-col gap-4 py-1 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <AppBadge tone="outline">Smart Product Search</AppBadge>
            <AppBadge tone={health?.status === 'healthy' ? 'accent' : 'danger'}>
              {health?.status ?? 'offline'}
            </AppBadge>
            {loadingData ? <AppBadge tone="info">Обновляем состояние</AppBadge> : null}
          </div>
          <div className="text-2xl font-semibold tracking-tight text-[var(--semantic-text-primary)]">
            Умный поиск продукции для закупок
          </div>
          <div className="max-w-[72ch] text-sm leading-6 text-[var(--semantic-text-secondary)]">
            Поиск, персонализированная витрина, динамическая перестройка выдачи и работа с датасетом
            в одном интерфейсе.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AppLink href="#search-workspace">К рабочей области</AppLink>
          <AppButton variant="outline" onClick={onRefresh}>
            Обновить данные
          </AppButton>
        </div>
      </AppCardContent>
    </AppCard>
  )
}
