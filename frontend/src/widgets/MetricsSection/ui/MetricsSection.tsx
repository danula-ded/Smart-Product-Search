import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

import type { MetricsSummary } from '@/shared/api'
import { formatMetric, formatNumber } from '@/shared/lib/format'
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle, Skeleton } from '@/shared/ui'

type MetricsSectionProps = {
  metrics: MetricsSummary | null
  metricsLoading: boolean
}

function CompactStat(props: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] px-4 py-4 transition-colors duration-200 hover:border-[var(--semantic-border-strong)]">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--semantic-text-muted)]">
        {props.label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-[var(--semantic-text-primary)]">
        {props.value}
      </div>
    </div>
  )
}

function MetricDeltaCard(props: {
  label: string
  baseline: number | null | undefined
  personalized: number | null | undefined
}) {
  const baseline = props.baseline ?? 0
  const personalized = props.personalized ?? 0
  const delta = personalized - baseline
  const direction = delta >= 0 ? 'up' : 'down'

  return (
    <AppCard>
      <AppCardHeader className="pb-1">
        <AppCardTitle>{props.label}</AppCardTitle>
      </AppCardHeader>
      <AppCardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border border-[var(--semantic-border-default)] bg-[var(--semantic-background-section)] p-3 transition-colors duration-200 hover:border-[var(--semantic-border-strong)]">
            <div className="text-xs text-[var(--semantic-text-muted)]">Baseline</div>
            <div className="mt-1 font-medium text-[var(--semantic-text-primary)]">
              {formatMetric(baseline)}
            </div>
          </div>
          <div className="rounded-md border border-[var(--semantic-border-default)] bg-[var(--semantic-background-section)] p-3 transition-colors duration-200 hover:border-[var(--semantic-border-strong)]">
            <div className="text-xs text-[var(--semantic-text-muted)]">Personalized</div>
            <div className="mt-1 font-medium text-[var(--semantic-text-primary)]">
              {formatMetric(personalized)}
            </div>
          </div>
        </div>
        <div className="rounded-md border border-[var(--semantic-border-default)] px-3 py-3 text-sm transition-colors duration-200 hover:border-[var(--semantic-border-strong)]">
          <div className="flex items-center gap-2 font-medium text-[var(--semantic-text-primary)]">
            {direction === 'up' ? (
              <ArrowUpRight className="size-4 text-[var(--semantic-status-success)]" />
            ) : (
              <ArrowDownRight className="size-4 text-[var(--semantic-status-danger)]" />
            )}
            <span>
              {delta >= 0 ? '+' : ''}
              {delta.toFixed(4)}
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-[var(--semantic-progress-track)]">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${Math.max(6, Math.min(100, personalized * 100))}%` }}
            />
          </div>
        </div>
      </AppCardContent>
    </AppCard>
  )
}

export function MetricsSection({ metrics, metricsLoading }: MetricsSectionProps) {
  return (
    <AppCard>
      <AppCardHeader>
        <AppCardTitle>Метрики качества</AppCardTitle>
      </AppCardHeader>
      <AppCardContent>
        {metricsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`metric-skeleton-${index}`}
                className="rounded-xl border border-[var(--semantic-border-default)] bg-[var(--semantic-background-card)] p-5"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-4 h-5 w-20" />
                <Skeleton className="mt-3 h-2 w-full" />
              </div>
            ))}
          </div>
        ) : metrics ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricDeltaCard
                label="NDCG@10"
                baseline={metrics.baseline.ndcgAt10}
                personalized={metrics.personalized.ndcgAt10}
              />
              <MetricDeltaCard
                label="MRR@10"
                baseline={metrics.baseline.mrrAt10}
                personalized={metrics.personalized.mrrAt10}
              />
              <MetricDeltaCard
                label="Recall@20"
                baseline={metrics.baseline.recallAt20}
                personalized={metrics.personalized.recallAt20}
              />
              <MetricDeltaCard
                label="Success@5"
                baseline={metrics.baseline.successAt5}
                personalized={metrics.personalized.successAt5}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <CompactStat label="Товаров" value={formatNumber(metrics.dataset.products)} />
              <CompactStat label="Контрактов" value={formatNumber(metrics.dataset.contracts)} />
            </div>
          </div>
        ) : (
          <div className="text-sm text-[var(--semantic-text-secondary)]">
            Метрики будут подгружены при открытии вкладки.
          </div>
        )}
      </AppCardContent>
    </AppCard>
  )
}
