import type { MetricsSummary } from '@/shared/api'
import { SectionTitle } from '@/shared/ui'
import { DynamicsSection } from '@/widgets/DynamicsSection'
import { MetricsSection } from '@/widgets/MetricsSection'

type ComparisonRow = {
  id: string
  title: string
  before: number | null
  after: number
  delta: number | null
}

type AnalyticsSectionProps = {
  metrics: MetricsSummary | null
  metricsLoading: boolean
  comparisonRows: ComparisonRow[]
}

export function AnalyticsSection({
  metrics,
  metricsLoading,
  comparisonRows,
}: AnalyticsSectionProps) {
  return (
    <section className="space-y-4">
      <SectionTitle
        title="Аналитика"
        description="Сводка по качеству выдачи и изменениям результатов после пользовательских действий."
      />

      <div className="space-y-6">
        <MetricsSection metrics={metrics} metricsLoading={metricsLoading} />
        <DynamicsSection comparisonRows={comparisonRows} />
      </div>
    </section>
  )
}
