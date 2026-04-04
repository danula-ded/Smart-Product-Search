import type { SearchResult } from '@/entities/product'
import type { SearchResponse } from '@/shared/api'
import { FeedbackLegend } from '@/features/search-products'
import { SearchPagination } from '@/features/search-pagination'
import { formatNumber } from '@/shared/lib/format'
import { AppBadge, EmptyState } from '@/shared/ui'
import { ProductGrid } from '@/widgets/ProductGrid'

type ProductListSectionProps = {
  searchState: SearchResponse | null
  isFeedMode: boolean
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
  isFeedMode,
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
        {searchState ? (
          <div className="flex flex-wrap gap-2">
            <AppBadge tone="outline">Нормализация {searchState.timingsMs.normalize} ms</AppBadge>
            <AppBadge tone="outline">Поиск {searchState.timingsMs.retrieve} ms</AppBadge>
            <AppBadge tone="outline">Переранжирование {searchState.timingsMs.rerank} ms</AppBadge>
            <AppBadge>{isFeedMode ? 'Подборка' : 'Всего'} {searchState.timingsMs.total} ms</AppBadge>
          </div>
        ) : null}
      </div>

      {searchState ? <FeedbackLegend /> : null}

      {searchState ? (
        <SearchPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={searchState.limit}
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
