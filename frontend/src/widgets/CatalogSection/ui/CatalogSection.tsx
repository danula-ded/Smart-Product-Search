import { Database } from 'lucide-react'

import type { SearchResult } from '@/entities/product'
import { SearchToolbar } from '@/features/search-products'
import type {
  DemoProfile,
  ProfileSummary,
  SearchFacetBucket,
  SearchFacetGroup,
  SearchFilters,
  SearchResponse,
} from '@/shared/api'
import { formatNumber } from '@/shared/lib/format'
import { EmptyState, SectionTitle } from '@/shared/ui'
import { CatalogFilters } from '@/widgets/CatalogFilters'
import { ProductListSection } from '@/widgets/ProductListSection'

type CatalogSectionProps = {
  error: string | null
  query: string
  selectedCustomer: string
  profiles: DemoProfile[]
  hasDataset: boolean
  activeFilterCount: number
  filters: SearchFilters
  categoryFacets: SearchFacetBucket[]
  brandFacets: SearchFacetBucket[]
  attributeFacets: SearchFacetGroup[]
  profileSummary: ProfileSummary | null | undefined
  searchState: SearchResponse | null
  searching: boolean
  currentPage: number
  totalPages: number
  onQueryChange: (value: string) => void
  onProfileChange: (value: string) => void
  onSearch: () => void
  onReset: () => void
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onFilterToggle: (group: keyof SearchFilters, value: string, checked: boolean) => void
  onClearAll: () => void
  onOpen: (result: SearchResult, position: number) => void
  onRelevant: (result: SearchResult, position: number) => void
  onIrrelevant: (result: SearchResult, position: number) => void
  onBounce: (result: SearchResult, position: number) => void
  onSave: (result: SearchResult, position: number) => void
  onDetails: (result: SearchResult) => void
}

export function CatalogSection({
  error,
  query,
  selectedCustomer,
  profiles,
  hasDataset,
  activeFilterCount,
  filters,
  categoryFacets,
  brandFacets,
  attributeFacets,
  profileSummary,
  searchState,
  searching,
  currentPage,
  totalPages,
  onQueryChange,
  onProfileChange,
  onSearch,
  onReset,
  onPageChange,
  onPageSizeChange,
  onFilterToggle,
  onClearAll,
  onOpen,
  onRelevant,
  onIrrelevant,
  onBounce,
  onSave,
  onDetails,
}: CatalogSectionProps) {
  return (
    <section className="space-y-4">
      <SectionTitle
        title="Каталог продукции"
        description={
          hasDataset
            ? 'Поиск, фильтры и результаты собраны в одной рабочей области.'
            : 'Каталог временно недоступен, пока база продукции не подготовлена.'
        }
      />

      {error ? (
        <div className="rounded-lg border border-[var(--semantic-border-interactive)] bg-[var(--semantic-background-danger)] px-4 py-4 text-sm text-[var(--semantic-status-danger)]">
          {error}
        </div>
      ) : null}

      <SearchToolbar
        query={query}
        selectedCustomer={selectedCustomer}
        profiles={profiles}
        hasDataset={hasDataset}
        searching={searching}
        onQueryChange={onQueryChange}
        onProfileChange={onProfileChange}
        onSearch={onSearch}
        onReset={onReset}
      />

      {!hasDataset ? (
        <EmptyState
          icon={<Database className="size-6" />}
          title="Каталог пока недоступен"
          description="После подготовки базы здесь появятся строка поиска, фильтры и результаты по продукции."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <CatalogFilters
            activeFilterCount={activeFilterCount}
            filters={filters}
            categoryFacets={categoryFacets}
            brandFacets={brandFacets}
            attributeFacets={attributeFacets}
            profileSummary={profileSummary}
            onFilterToggle={onFilterToggle}
            onClearAll={onClearAll}
          />

          <ProductListSection
            searchState={searchState}
            searching={searching}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            onOpen={onOpen}
            onRelevant={onRelevant}
            onIrrelevant={onIrrelevant}
            onBounce={onBounce}
            onSave={onSave}
            onDetails={onDetails}
          />
        </div>
      )}
    </section>
  )
}
