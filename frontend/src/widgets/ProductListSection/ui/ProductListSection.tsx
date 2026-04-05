import type { SearchResult } from '@/entities/product'
import type { SearchResponse } from '@/shared/api'
import { SearchPagination } from '@/features/search-pagination'
import { EmptyState } from '@/shared/ui'
import { formatNumber } from '@/shared/lib/format'
import { ProductGrid } from '@/widgets/ProductGrid'

type ProductListSectionProps = {
  searchState: SearchResponse | null
  searching: boolean
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onOpen: (result: SearchResult, position: number) => void
  onRelevant: (result: SearchResult, position: number) => void
  onIrrelevant: (result: SearchResult, position: number) => void
  onBounce: (result: SearchResult, position: number) => void
  onSave: (result: SearchResult, position: number) => void
  onDetails: (result: SearchResult) => void
}

export function ProductListSection({
  searchState,
  searching,
  currentPage,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onOpen,
  onRelevant,
  onIrrelevant,
  onBounce,
  onSave,
  onDetails,
}: ProductListSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-[var(--semantic-text-secondary)]">
            {!searchState &&  'Сначала выполните поиск.'}
          </div>
        </div>
      </div>

      <ProductGrid
        results={searchState?.results ?? []}
        offset={searchState?.offset ?? 0}
        loading={searching}
        showInitialSkeletons={!searchState}
        onOpen={onOpen}
        onRelevant={onRelevant}
        onIrrelevant={onIrrelevant}
        onBounce={onBounce}
        onSave={onSave}
        onDetails={onDetails}
      />

      {searchState && searchState.results.length > 0 ? (
        <div className="pt-2">
          <SearchPagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={searchState.limit}
            totalCount={searchState.totalCount}
            disabled={searching}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      ) : null}

      {searchState && searchState.results.length === 0 ? (
        <EmptyState
          title="Ничего не найдено"
          description="Попробуйте убрать часть фильтров или изменить запрос."
        />
      ) : null}
    </div>
  )
}
