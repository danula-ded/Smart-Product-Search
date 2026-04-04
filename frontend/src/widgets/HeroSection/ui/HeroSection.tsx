import type { ReactNode } from 'react'
import { BadgeCheck, Database, FolderSync, UserRound } from 'lucide-react'

import type { DatasetSummary, DemoProfile, Health, SearchResponse } from '@/shared/api'
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
  health: Health | null
  summary: DatasetSummary | null
  loadingData: boolean
  sessionId: string
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

export function HeroSection({
  health,
  summary,
  loadingData,
  sessionId,
  selectedProfile,
  searchState,
}: HeroSectionProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
      <AppCard tone="highlight">
        <AppCardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <AppBadge tone="outline">Основной экран</AppBadge>
            <AppBadge tone={health?.status === 'healthy' ? 'accent' : 'danger'}>
              {health?.status ?? 'offline'}
            </AppBadge>
            {loadingData ? <AppBadge tone="info">Синхронизация</AppBadge> : null}
          </div>
          <AppCardTitle className="text-2xl sm:text-3xl">
            Поиск и персонализация СТЕ
          </AppCardTitle>
          <AppCardDescription>
            Единый экран для демо: поиск, динамические фильтры, профили заказчиков и живая
            перестройка выдачи после действий пользователя.
          </AppCardDescription>
        </AppCardHeader>
        <AppCardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CompactStat
            label="Товаров в индексе"
            value={formatNumber(summary?.counts.products)}
            icon={<Database className="size-3.5 text-[var(--semantic-icon-primary)]" />}
          />
          <CompactStat
            label="Контрактов"
            value={formatNumber(summary?.counts.contracts)}
            icon={<FolderSync className="size-3.5 text-[var(--semantic-icon-primary)]" />}
          />
          <CompactStat
            label="Профилей"
            value={formatNumber(summary?.counts.profiles)}
            icon={<UserRound className="size-3.5 text-[var(--semantic-icon-primary)]" />}
          />
          <CompactStat
            label="Версия backend"
            value={health?.version ?? 'n/a'}
            icon={<BadgeCheck className="size-3.5 text-[var(--semantic-icon-primary)]" />}
          />
        </AppCardContent>
      </AppCard>

      <AppCard tone="info">
        <AppCardHeader>
          <AppCardTitle>Текущий контекст</AppCardTitle>
          <AppCardDescription>
            Поиск идёт по FTS5, затем ранжирование меняется историей контрактов и событиями текущей
            сессии.
          </AppCardDescription>
        </AppCardHeader>
        <AppCardContent className="space-y-3">
          <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--semantic-text-muted)]">
              Текущая сессия
            </div>
            <div className="mt-2 font-medium text-[var(--semantic-text-primary)]">{sessionId}</div>
          </div>
          <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--semantic-text-muted)]">
              Выбранный профиль
            </div>
            <div className="mt-2 text-sm font-medium text-[var(--semantic-text-primary)]">
              {selectedProfile?.summary.customerName ?? 'Профиль не выбран'}
            </div>
            <div className="mt-1 text-xs text-[var(--semantic-text-muted)]">
              {selectedProfile?.customerId ?? 'Без customerId'}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-section)] p-4 text-sm leading-6 text-[var(--semantic-text-secondary)]">
            {searchState
              ? `Последний поиск: ${searchState.totalCount} результатов, API ${searchState.timingsMs.total} ms`
              : 'Пока нет активного поискового ответа. Выполни запрос или переключи профиль после поиска.'}
          </div>
        </AppCardContent>
      </AppCard>
    </section>
  )
}
