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
  open: boolean
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
  open,
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
    <div
      id="catalog-filters-panel"
      className={`grid overflow-hidden transition-all duration-300 ease-out ${
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      }`}
      aria-hidden={!open}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="grid gap-4 pb-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.95fr)]">
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
                Меняется сразу при переключении профиля и влияет на ранжирование без
                перезапуска сервера.
              </AppCardDescription>
            </AppCardHeader>
            <AppCardContent>
              <CustomerProfileCard profileSummary={profileSummary} />
            </AppCardContent>
          </AppCard>
        </div>
      </div>
    </div>
  )
}
