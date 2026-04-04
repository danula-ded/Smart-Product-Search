import type { ProfileSummary } from '@/shared/api'
import { formatMoney, formatNumber } from '@/shared/lib/format'
import { AppBadge } from '@/shared/ui'

type CustomerProfileCardProps = {
  profileSummary: ProfileSummary | null | undefined
}

export function CustomerProfileCard({ profileSummary }: CustomerProfileCardProps) {
  if (!profileSummary) {
    return (
      <div className="text-sm leading-6 text-[var(--semantic-text-secondary)]">
        После поиска здесь появится краткий профиль выбранного заказчика.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-section)] p-4">
        <div className="font-semibold text-[var(--semantic-text-primary)]">
          {profileSummary.customerName}
        </div>
        <div className="mt-1 text-xs text-[var(--semantic-text-muted)]">
          {profileSummary.customerId}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md border border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] px-4 py-3">
          <div className="text-xs text-[var(--semantic-text-muted)]">Закупок</div>
          <div className="mt-1 font-semibold text-[var(--semantic-text-primary)]">
            {formatNumber(profileSummary.purchaseCount)}
          </div>
        </div>
        <div className="rounded-md border border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] px-4 py-3">
          <div className="text-xs text-[var(--semantic-text-muted)]">Совпало с профилем</div>
          <div className="mt-1 font-semibold text-[var(--semantic-text-primary)]">
            {formatNumber(profileSummary.matchedPurchaseCount)}
          </div>
        </div>
        <div className="rounded-md border border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] px-4 py-3">
          <div className="text-xs text-[var(--semantic-text-muted)]">Сумма контрактов</div>
          <div className="mt-1 font-semibold text-[var(--semantic-text-primary)]">
            {formatMoney(profileSummary.totalSpend)}
          </div>
        </div>
        <div className="rounded-md border border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] px-4 py-3">
          <div className="text-xs text-[var(--semantic-text-muted)]">Последняя закупка</div>
          <div className="mt-1 font-semibold text-[var(--semantic-text-primary)]">
            {profileSummary.lastPurchaseAt ?? '—'}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold text-[var(--semantic-text-primary)]">
          Топ категорий
        </div>
        <div className="flex flex-wrap gap-2">
          {profileSummary.topCategories.slice(0, 6).map((item) => (
            <AppBadge key={item.value} tone="accent">
              {item.value}
            </AppBadge>
          ))}
        </div>
      </div>
    </div>
  )
}
