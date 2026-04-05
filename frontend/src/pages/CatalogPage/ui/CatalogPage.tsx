import { ProductDetailsDialog } from '@/entities/product'
import { useWorkspace } from '@/shared/lib/workspace'
import { CatalogSection } from '@/widgets/CatalogSection'

export function CatalogPage() {
  const model = useWorkspace()

  return (
    <>
      <CatalogSection
        hasDataset={model.hasDataset}
        activeFilterCount={model.activeFilterCount}
        filters={model.filters}
        categoryFacets={model.categoryFacets}
        brandFacets={model.brandFacets}
        attributeFacets={model.attributeFacets}
        profileSummary={model.profileSummary}
        searchState={model.searchState}
        searching={model.searching}
        currentPage={model.currentPage}
        totalPages={model.totalPages}
        onPageChange={(nextPage) => {
          void model.executeSearch({
            capturePrevious: false,
            nextPage,
          })
        }}
        onPageSizeChange={(nextPageSize) => {
          void model.executeSearch({
            capturePrevious: false,
            nextPage: 1,
            nextPageSize,
          })
        }}
        onFilterToggle={model.handleFilterToggle}
        onClearAll={model.clearAllFilters}
        onOpen={(result, position) => {
          void model.handleResultEvent('result_opened', result, position, true)
        }}
        onRelevant={(result, position) => {
          void model.handleResultEvent('marked_relevant', result, position)
        }}
        onIrrelevant={(result, position) => {
          void model.handleResultEvent('marked_irrelevant', result, position)
        }}
        onBounce={(result, position) => {
          void model.handleResultEvent('result_bounced', result, position)
        }}
        onSave={(result, position) => {
          void model.handleResultEvent('result_saved', result, position)
        }}
        onDetails={model.openDetails}
      />

      <ProductDetailsDialog
        result={model.activeResult}
        open={Boolean(model.activeResult)}
        onOpenChange={(open) => !open && model.closeDetails()}
        onRelevant={
          model.activeResult
            ? () =>
                void model.handleResultEvent(
                  'marked_relevant',
                  model.activeResult!,
                  model.getResultPosition(model.activeResult!),
                )
            : undefined
        }
        onIrrelevant={
          model.activeResult
            ? () =>
                void model.handleResultEvent(
                  'marked_irrelevant',
                  model.activeResult!,
                  model.getResultPosition(model.activeResult!),
                )
            : undefined
        }
      />
    </>
  )
}
