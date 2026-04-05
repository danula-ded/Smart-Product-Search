import type { ReactNode } from 'react'
import { Database, FolderSync } from 'lucide-react'

import type { DatasetSummary, DemoProfile, SearchResponse } from '@/shared/api'
import { formatNumber } from '@/shared/lib/format'
import {
  AppBadge,
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/shared/ui'

type HeroSectionProps = {
  summary: DatasetSummary | null
  selectedProfile: DemoProfile | null
  searchState: SearchResponse | null
}

function CompactStat(props: { label: string; value: string | number; icon?: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] px-4 py-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-[var(--semantic-text-muted)]">
        {props.icon}
        <span>{props.label}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-[var(--semantic-text-primary)]">
        {props.value}
      </div>
    </div>
  )
}

export function HeroSection({ summary, selectedProfile, searchState }: HeroSectionProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
      <AppCard tone="highlight">
        <AppCardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <AppBadge tone="outline">Общая информация</AppBadge>
          </div>
          <AppCardTitle className="text-2xl sm:text-3xl">Поиск и подбор продукции</AppCardTitle>
          <AppCardDescription>
            Основные показатели каталога и текущий рабочий контекст собраны в одном блоке.
          </AppCardDescription>
        </AppCardHeader>
        <AppCardContent className="grid gap-3 sm:grid-cols-2">
          <CompactStat
            label="Товаров в каталоге"
            value={formatNumber(summary?.counts.products)}
            icon={<Database className="size-3.5 text-[var(--semantic-icon-primary)]" />}
          />
          <CompactStat
            label="Контрактов"
            value={formatNumber(summary?.counts.contracts)}
            icon={<FolderSync className="size-3.5 text-[var(--semantic-icon-primary)]" />}
          />
        </AppCardContent>
      </AppCard>

      <AppCard tone="info">
        <AppCardHeader>
          <AppCardTitle>Текущий контекст</AppCardTitle>
          <AppCardDescription>
            Здесь видно, какой профиль сейчас выбран и что происходило в последнем поисковом
            ответе.
          </AppCardDescription>
        </AppCardHeader>
        <AppCardContent className="space-y-3">
          <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--semantic-text-muted)]">
              Выбранный профиль
            </div>
            <div className="mt-2 text-sm font-medium text-[var(--semantic-text-primary)]">
              {selectedProfile?.summary.customerName ?? 'Новый или невыбранный заказчик'}
            </div>
            <div className="mt-1 text-xs text-[var(--semantic-text-muted)]">
              {selectedProfile?.customerId ?? 'Без customerId'}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-section)] p-4 text-sm leading-6 text-[var(--semantic-text-secondary)]">
            {searchState
              ? `Последний поиск: ${searchState.totalCount} результатов, API ${searchState.timingsMs.total} ms`
              : 'Пока нет активного поискового ответа. Перейдите в каталог и выполните поиск или откройте персональную витрину.'}
          </div>
        </AppCardContent>
      </AppCard>
    </section>
  )
}
