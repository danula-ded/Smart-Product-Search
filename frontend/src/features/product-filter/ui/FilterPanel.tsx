import type { SearchFacetGroup, SearchFilters, SearchFacetBucket } from '@/shared/api'
import { AppBadge, AppButton, ScrollArea, Separator } from '@/shared/ui'

import { FilterBucket } from './FilterBucket'

type FilterPanelProps = {
  activeFilterCount: number
  filters: SearchFilters
  categoryFacets: SearchFacetBucket[]
  brandFacets: SearchFacetBucket[]
  attributeFacets: SearchFacetGroup[]
  onFilterToggle: (group: keyof SearchFilters, value: string, checked: boolean) => void
  onClearAll: () => void
}

export function FilterPanel({
  activeFilterCount,
  filters,
  categoryFacets,
  brandFacets,
  attributeFacets,
  onFilterToggle,
  onClearAll,
}: FilterPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <AppBadge tone="outline">{activeFilterCount} активных</AppBadge>
        <AppButton
          size="sm"
          variant="ghost"
          disabled={activeFilterCount === 0}
          onClick={onClearAll}
        >
          Сбросить
        </AppButton>
      </div>

      <ScrollArea className="h-[min(560px,70vh)] pr-3">
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-[var(--semantic-text-primary)]">Категории</div>
            {categoryFacets.length === 0 ? (
              <div className="text-sm text-[var(--semantic-text-secondary)]">Нет данных</div>
            ) : (
              categoryFacets.map((bucket) => (
                <FilterBucket
                  key={`category-${bucket.value}`}
                  bucket={bucket}
                  checked={(filters.categories ?? []).includes(bucket.value)}
                  onChange={(checked) => onFilterToggle('categories', bucket.value, checked)}
                />
              ))
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-semibold text-[var(--semantic-text-primary)]">Бренды</div>
            {brandFacets.length === 0 ? (
              <div className="text-sm text-[var(--semantic-text-secondary)]">Нет данных</div>
            ) : (
              brandFacets.map((bucket) => (
                <FilterBucket
                  key={`brand-${bucket.value}`}
                  bucket={bucket}
                  checked={(filters.brands ?? []).includes(bucket.value)}
                  onChange={(checked) => onFilterToggle('brands', bucket.value, checked)}
                />
              ))
            )}
          </div>

          {attributeFacets.map((group) => (
            <div key={group.name} className="space-y-2">
              <Separator />
              <div className="text-sm font-semibold text-[var(--semantic-text-primary)]">
                {group.name}
              </div>
              {group.values.map((bucket) => {
                const bucketKey = bucket.key ?? `${group.name}::${bucket.value}`
                return (
                  <FilterBucket
                    key={bucketKey}
                    bucket={bucket}
                    checked={(filters.attributes ?? []).includes(bucketKey)}
                    onChange={(checked) => onFilterToggle('attributes', bucketKey, checked)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
