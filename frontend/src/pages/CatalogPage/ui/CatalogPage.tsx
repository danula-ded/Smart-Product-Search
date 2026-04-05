import { ProductDetailsDialog } from '@/entities/product'
import { useWorkspace } from '@/shared/lib/workspace'
import { CatalogSection } from '@/widgets/CatalogSection'

export function CatalogPage() {
  const model = useWorkspace()
  const activeResult = model.activeResult

  return (
    <>
      <CatalogSection
        error={model.error}
        query={model.query}
        selectedCustomer={model.selectedCustomer}
        profiles={model.profiles}
        hasDataset={model.hasDataset}
        isFeedMode={model.isFeedMode}
        interpretation={model.interpretation}
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
        onQueryChange={model.setQuery}
        onProfileChange={model.handleProfileChange}
        onSearch={model.startSearch}
        onReset={model.resetSearch}
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
        result={activeResult}
        open={Boolean(activeResult)}
        onOpenChange={(open) => !open && model.closeDetails()}
        onRelevant={
          activeResult
            ? () =>
                void model.handleResultEvent(
                  'marked_relevant',
                  activeResult,
                  model.getResultPosition(activeResult),
                )
            : undefined
        }
        onIrrelevant={
          activeResult
            ? () =>
                void model.handleResultEvent(
                  'marked_irrelevant',
                  activeResult,
                  model.getResultPosition(activeResult),
                )
            : undefined
        }
      />
    </>
  )
}
