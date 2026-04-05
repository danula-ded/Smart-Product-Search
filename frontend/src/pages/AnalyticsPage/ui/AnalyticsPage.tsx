import { useEffect } from 'react'

import { useWorkspace } from '@/shared/lib/workspace'
import { AnalyticsSection } from '@/widgets/AnalyticsSection'

export function AnalyticsPage() {
  const model = useWorkspace()

  useEffect(() => {
    if (!model.metrics && !model.metricsLoading) {
      void model.refreshMetrics()
    }
  }, [model.metrics, model.metricsLoading, model.refreshMetrics])

  return (
    <AnalyticsSection
      metrics={model.metrics}
      metricsLoading={model.metricsLoading}
      comparisonRows={model.comparisonRows}
    />
  )
}
