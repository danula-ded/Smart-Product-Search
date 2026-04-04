import { Database } from 'lucide-react'

import { ProductDetailsDialog } from '@/entities/product'
import { SearchInterpretation, SearchToolbar } from '@/features/search-products'
import { AppButton, AppCard, AppCardContent, AppCardHeader, AppCardTitle, AppContainer, EmptyState, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui'
import { CatalogFilters } from '@/widgets/CatalogFilters'
import { DataSection } from '@/widgets/DataSection'
import { DynamicsSection } from '@/widgets/DynamicsSection'
import { Footer } from '@/widgets/Footer'
import { Header } from '@/widgets/Header'
import { HeroSection } from '@/widgets/HeroSection'
import { MetricsSection } from '@/widgets/MetricsSection'
import { ProductListSection } from '@/widgets/ProductListSection'

import { useHomePageModel } from '../model/useHomePageModel'

export function HomePage() {
  const model = useHomePageModel()

  return (
    <div id="top" className="min-h-screen bg-background text-foreground">
      <AppContainer className="brand-shell">
        <Header
          health={model.health}
          loadingData={model.loadingData}
          onRefresh={() => void model.refreshAll()}
        />

        <HeroSection
          health={model.health}
          summary={model.summary}
          loadingData={model.loadingData}
          sessionId={model.sessionId}
          selectedProfile={model.selectedProfile}
          searchState={model.searchState}
        />

        {model.error ? (
          <div className="rounded-lg border border-[var(--semantic-border-interactive)] bg-[var(--semantic-background-danger)] px-4 py-4 text-sm text-[var(--semantic-status-danger)]">
            {model.error}
          </div>
        ) : null}

        <Tabs value={model.activeTab} onValueChange={(value) => model.setActiveTab(value as typeof model.activeTab)}>
          <TabsList variant="line" className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="search">Поиск</TabsTrigger>
            <TabsTrigger value="dynamics">Динамика</TabsTrigger>
            <TabsTrigger value="metrics">Метрики</TabsTrigger>
            <TabsTrigger value="data">Данные</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <AppCard tone="highlight">
              <AppCardHeader>
                <AppCardTitle>Поисковый запрос</AppCardTitle>
              </AppCardHeader>
              <AppCardContent className="space-y-4">
                <SearchToolbar
                  query={model.query}
                  isFeedMode={model.isFeedMode}
                  selectedCustomer={model.selectedCustomer}
                  profiles={model.profiles}
                  hasDataset={model.hasDataset}
                  searching={model.searching}
                  includeDebug={model.includeDebug}
                  analysisLoading={model.analysisLoading}
                  onQueryChange={model.setQuery}
                  onProfileChange={model.handleProfileChange}
                  onSearch={model.startSearch}
                  onNewSession={model.startNewSession}
                  onIncludeDebugChange={model.setIncludeDebug}
                />
                <SearchInterpretation query={model.query} interpretation={model.interpretation} />
              </AppCardContent>
            </AppCard>

            {!model.hasDataset ? (
              <EmptyState
                icon={<Database className="size-6" />}
                title="Индекс пока пустой"
                description="Сначала загрузи встроенный датасет или дозагрузи свои CSV на вкладке «Данные»."
                action={
                  <AppButton variant="outline" onClick={() => model.setActiveTab('data')}>
                    <Database className="size-4" />
                    Перейти к данным
                  </AppButton>
                }
              />
            ) : (
              <div
                id="search-workspace"
                className={model.isFeedMode ? 'grid gap-6' : 'grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]'}
              >
                {!model.isFeedMode ? (
                  <CatalogFilters
                    activeFilterCount={model.activeFilterCount}
                    filters={model.filters}
                    categoryFacets={model.categoryFacets}
                    brandFacets={model.brandFacets}
                    attributeFacets={model.attributeFacets}
                    profileSummary={model.profileSummary}
                    onFilterToggle={model.handleFilterToggle}
                    onClearAll={model.clearAllFilters}
                  />
                ) : null}
                <ProductListSection
                  searchState={model.searchState}
                  isFeedMode={model.isFeedMode}
                  searching={model.searching}
                  currentPage={model.currentPage}
                  totalPages={model.totalPages}
                  onPageChange={(nextPage) => {
                    void model.executeSearch({
                      capturePrevious: false,
                      nextPage,
                      targetTab: 'search',
                    })
                  }}
                  onPageSizeChange={(nextPageSize) => {
                    void model.executeSearch({
                      capturePrevious: false,
                      nextPage: 1,
                      nextPageSize,
                      targetTab: 'search',
                    })
                  }}
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
              </div>
            )}
          </TabsContent>

          <TabsContent value="dynamics">
            <DynamicsSection comparisonRows={model.comparisonRows} />
          </TabsContent>

          <TabsContent value="metrics">
            <MetricsSection metrics={model.metrics} metricsLoading={model.metricsLoading} />
          </TabsContent>

          <TabsContent value="data">
            <DataSection
              datasetBusy={model.datasetBusy}
              displayedJob={model.displayedJob}
              mode={model.mode}
              steFile={model.steFile}
              contractsFile={model.contractsFile}
              onModeChange={model.setMode}
              onSteFileChange={model.setSteFile}
              onContractsFileChange={model.setContractsFile}
              onBootstrap={() => void model.handleBootstrap()}
              onClear={() => void model.handleClear()}
              onUpload={() => void model.handleUpload()}
            />
          </TabsContent>
        </Tabs>

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

        <Footer health={model.health} />
      </AppContainer>
    </div>
  )
}
