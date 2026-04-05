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

export function HeroSection({ summary }: HeroSectionProps) {
  return (
    <section>
      <AppCard tone="highlight">
        <AppCardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <AppBadge tone="outline">Общая информация</AppBadge>
          </div>
          <AppCardTitle className="text-2xl sm:text-3xl">
            Поиск и подбор продукции
          </AppCardTitle>
          <AppCardDescription>
            Основные показатели каталога собраны в одном блоке.
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
    </section>
  )
}
