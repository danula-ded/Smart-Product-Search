import type { ReactNode } from 'react'
import { ChevronDown, Filter } from 'lucide-react'

import type { SearchResult } from '@/entities/product'
import type { SearchResponse } from '@/shared/api'
import { SearchPagination } from '@/features/search-pagination'
import { formatNumber } from '@/shared/lib/format'
import { AppBadge, AppButton, EmptyState } from '@/shared/ui'
import { ProductGrid } from '@/widgets/ProductGrid'

type ProductListSectionProps = {
  searchState: SearchResponse | null
  isFeedMode?: boolean
  searching: boolean
  activeFilterCount: number
  filtersOpen: boolean
  filterPanel?: ReactNode
  currentPage: number
  totalPages: number
  onToggleFilters: () => void
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
  isFeedMode = false,
  searching,
  activeFilterCount,
  filtersOpen,
  filterPanel,
  currentPage,
  totalPages,
  onToggleFilters,
  onPageChange,
  onPageSizeChange,
  onOpen,
  onRelevant,
  onIrrelevant,
  onBounce,
  onSave,
  onDetails,
}: ProductListSectionProps) {
  const title = isFeedMode ? 'Персональная витрина' : 'Выдача'
  const subtitle = searchState
    ? `${formatNumber(searchState.totalCount)} результатов, страница ${formatNumber(currentPage)} из ${formatNumber(totalPages)}`
    : isFeedMode
      ? 'Оставьте поле запроса пустым, чтобы увидеть базовую подборку для выбранного профиля.'
      : 'Введите запрос, чтобы получить персонализированную выдачу.'
  const emptyTitle = isFeedMode ? 'Витрина пока пуста' : 'Ничего не найдено'
  const emptyDescription = isFeedMode
    ? 'Попробуйте выбрать другой профиль или загрузить данные на вкладке «Данные».'
    : 'Попробуйте убрать часть фильтров или изменить запрос.'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-[var(--semantic-text-primary)]">{title}</div>
          <div className="text-sm text-[var(--semantic-text-secondary)]">{subtitle}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isFeedMode ? (
            <AppButton
              variant={filtersOpen || activeFilterCount > 0 ? 'accent' : 'outline'}
              size="sm"
              className="gap-2"
              aria-expanded={filtersOpen}
              aria-controls="catalog-filters-panel"
              onClick={onToggleFilters}
            >
              <Filter className="size-4" />
              Фильтры
              {activeFilterCount > 0 ? (
                <AppBadge tone="primary">{activeFilterCount}</AppBadge>
              ) : null}
              <ChevronDown
                className={`size-4 transition-transform duration-200 ${
                  filtersOpen ? 'rotate-180' : ''
                }`}
              />
            </AppButton>
          ) : null}

          {searchState ? (
            <div className="flex flex-wrap gap-2">
              <AppBadge tone="outline">
                Нормализация {searchState.timingsMs.normalize} ms
              </AppBadge>
              <AppBadge tone="outline">Поиск {searchState.timingsMs.retrieve} ms</AppBadge>
              <AppBadge tone="outline">
                Переранжирование {searchState.timingsMs.rerank} ms
              </AppBadge>
              <AppBadge>
                {isFeedMode ? 'Подборка' : 'Всего'} {searchState.timingsMs.total} ms
              </AppBadge>
            </div>
          ) : null}
        </div>
      </div>

      {!isFeedMode ? filterPanel : null}

      {searchState ? (
        <SearchPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={searchState.limit}
          shownCount={searchState.results.length}
          totalCount={searchState.totalCount}
          disabled={searching}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : null}

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
        <SearchPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={searchState.limit}
          shownCount={searchState.results.length}
          totalCount={searchState.totalCount}
          disabled={searching}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : null}

      {searchState && searchState.results.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : null}
    </div>
  )
}
