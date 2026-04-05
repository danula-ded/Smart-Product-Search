import type { DatasetSummary, DemoProfile, SearchResponse } from '@/shared/api'
import { HeroSection } from '@/widgets/HeroSection'

type OverviewSectionProps = {
  summary: DatasetSummary | null
  selectedProfile: DemoProfile | null
  searchState: SearchResponse | null
}

export function OverviewSection({
  summary,
  selectedProfile,
  searchState,
}: OverviewSectionProps) {
  return (
    <section>
      <HeroSection
        summary={summary}
        selectedProfile={selectedProfile}
        searchState={searchState}
      />
    </section>
  )
}
