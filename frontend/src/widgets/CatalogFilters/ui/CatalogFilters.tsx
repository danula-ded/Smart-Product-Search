import { Filter } from 'lucide-react'

import type {
  ProfileSummary,
  SearchFacetBucket,
  SearchFacetGroup,
  SearchFilters,
} from '@/shared/api'
import { FilterPanel } from '@/features/product-filter'
import { CustomerProfileCard } from '@/features/profile-summary'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/shared/ui'

type CatalogFiltersProps = {
  activeFilterCount: number
  filters: SearchFilters
  categoryFacets: SearchFacetBucket[]
  brandFacets: SearchFacetBucket[]
  attributeFacets: SearchFacetGroup[]
  profileSummary: ProfileSummary | null | undefined
  onFilterToggle: (group: keyof SearchFilters, value: string, checked: boolean) => void
  onClearAll: () => void
}

export function CatalogFilters({
  activeFilterCount,
  filters,
  categoryFacets,
  brandFacets,
  attributeFacets,
  profileSummary,
  onFilterToggle,
  onClearAll,
}: CatalogFiltersProps) {
  return (
    <div className="space-y-6">
      <AppCard>
        <AppCardHeader>
          <AppCardTitle className="flex items-center gap-2">
            <Filter className="size-4 text-[var(--semantic-icon-primary)]" />
            Динамические фильтры
          </AppCardTitle>
          <AppCardDescription>
            Пересчитываются по текущей выдаче и сразу влияют на следующий запрос.
          </AppCardDescription>
        </AppCardHeader>
        <AppCardContent>
          <FilterPanel
            activeFilterCount={activeFilterCount}
            filters={filters}
            categoryFacets={categoryFacets}
            brandFacets={brandFacets}
            attributeFacets={attributeFacets}
            onFilterToggle={onFilterToggle}
            onClearAll={onClearAll}
          />
        </AppCardContent>
      </AppCard>

      <AppCard tone="info">
        <AppCardHeader>
          <AppCardTitle>Профиль заказчика</AppCardTitle>
          <AppCardDescription>
            Меняется сразу при переключении профиля и влияет на ранжирование без перезапуска
            сервера.
          </AppCardDescription>
        </AppCardHeader>
        <AppCardContent>
          <CustomerProfileCard profileSummary={profileSummary} />
        </AppCardContent>
      </AppCard>
    </div>
  )
}
