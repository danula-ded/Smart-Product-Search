import { useEffect, useMemo, useState } from 'react'

import {
  bootstrapDefaultDataset,
  clearDataset,
  getDatasetSummary,
  getDemoProfiles,
  getHealth,
  getJob,
  getMetrics,
  searchProducts,
  sendEvent,
  uploadDatasets,
  type DatasetJob,
  type DatasetSummary,
  type DemoProfile,
  type Health,
  type MetricsSummary,
  type SearchFilters,
  type SearchResponse,
  type SearchResult,
  type UploadMode,
} from '@/shared/api'
import { pageSizeOptions } from '@/shared/constants/search'
import { countActiveFilters, createSessionId, toggleArrayValue } from '@/shared/lib/search'

type ExecuteSearchOptions = {
  capturePrevious?: boolean
  nextCustomerId?: string
  nextSessionId?: string
  nextFilters?: SearchFilters
  nextPage?: number
  nextPageSize?: number
}

export function useWorkspaceModel() {
  const [health, setHealth] = useState<Health | null>(null)
  const [summary, setSummary] = useState<DatasetSummary | null>(null)
  const [profiles, setProfiles] = useState<DemoProfile[]>([])
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mode, setMode] = useState<UploadMode>('upsert_bundle')
  const [steFile, setSteFile] = useState<File | null>(null)
  const [contractsFile, setContractsFile] = useState<File | null>(null)
  const [jobState, setJobState] = useState<DatasetJob | null>(null)
  const [datasetBusy, setDatasetBusy] = useState(false)

  const [query, setQuery] = useState('aktirf smartbuy 16')
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [sessionId, setSessionId] = useState(createSessionId())
  const includeDebug = false
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(pageSizeOptions[0])
  const [filters, setFilters] = useState<SearchFilters>({})
  const [searchState, setSearchState] = useState<SearchResponse | null>(null)
  const [previousSearchState, setPreviousSearchState] = useState<SearchResponse | null>(null)
  const [searching, setSearching] = useState(false)
  const [activeResult, setActiveResult] = useState<SearchResult | null>(null)

  const hasDataset = (summary?.counts.products ?? 0) > 0
  const activeFilterCount = countActiveFilters(filters)
  const displayedJob =
    jobState ?? summary?.activeIndex.lastSuccessfulJob ?? summary?.imports[0] ?? null

  const comparisonRows = useMemo(() => {
    if (!previousSearchState || !searchState) {
      return []
    }

    return searchState.results.map((item, index) => {
      const beforeIndex = previousSearchState.results.findIndex(
        (previousItem) => previousItem.product.id === item.product.id,
      )

      return {
        id: item.product.id,
        title: item.product.title,
        before: beforeIndex >= 0 ? beforeIndex + 1 : null,
        after: index + 1,
        delta: beforeIndex >= 0 ? beforeIndex + 1 - (index + 1) : null,
      }
    })
  }, [previousSearchState, searchState])

  const categoryFacets = searchState?.facets?.categories ?? []
  const brandFacets = searchState?.facets?.brands ?? []
  const attributeFacets = searchState?.facets?.attributes ?? []
  const profileSummary = searchState?.profileSummary
  const selectedProfile = profiles.find((profile) => profile.customerId === selectedCustomer) ?? null
  const currentPage = searchState
    ? Math.max(1, Math.floor(searchState.offset / Math.max(searchState.limit, 1)) + 1)
    : page
  const totalPages = searchState
    ? Math.max(1, Math.ceil(searchState.totalCount / Math.max(searchState.limit, 1)))
    : 1

  useEffect(() => {
    void refreshAll()
  }, [])

  async function refreshAll() {
    setLoadingData(true)
    setError(null)
    try {
      const [healthResult, summaryResult, profilesResult] = await Promise.all([
        getHealth(),
        getDatasetSummary(),
        getDemoProfiles().catch(() => []),
      ])

      setHealth(healthResult)
      setSummary(summaryResult)
      setProfiles(profilesResult)
      setJobState((current) => {
        if (current?.status === 'running' || current?.status === 'queued') {
          return current
        }
        return summaryResult.activeIndex.lastSuccessfulJob ?? summaryResult.imports[0] ?? null
      })

      const selectedStillValid = profilesResult.some(
        (profile) => profile.customerId === selectedCustomer,
      )
      setSelectedCustomer(
        selectedStillValid ? selectedCustomer : (profilesResult[0]?.customerId ?? ''),
      )
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Не удалось загрузить состояние системы.',
      )
    } finally {
      setLoadingData(false)
    }
  }

  async function refreshMetrics() {
    setMetricsLoading(true)
    setError(null)
    try {
      setMetrics(await getMetrics())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось загрузить метрики.')
    } finally {
      setMetricsLoading(false)
    }
  }

  function resetSearchState() {
    setSearchState(null)
    setPreviousSearchState(null)
    setFilters({})
    setPage(1)
    setPageSize(pageSizeOptions[0])
    setSessionId(createSessionId())
    setActiveResult(null)
  }

  async function pollJob(jobId: string) {
    const deadline = Date.now() + 180_000
    while (Date.now() < deadline) {
      const current = await getJob(jobId)
      setJobState(current)
      if (current.status === 'successful') {
        return current
      }
      if (current.status === 'failed' || current.status === 'interrupted') {
        throw new Error(current.errors.join('; ') || 'Фоновая задача завершилась с ошибкой.')
      }
      await new Promise((resolve) => window.setTimeout(resolve, 800))
    }
    throw new Error('Обработка заняла слишком много времени.')
  }

  async function executeSearch(options?: ExecuteSearchOptions) {
    const normalizedQuery = query.trim()
    if (!normalizedQuery) {
      setError('Введите поисковый запрос хотя бы из одного символа.')
      return
    }

    const customerId = options?.nextCustomerId ?? (selectedCustomer || null)
    const currentSession = options?.nextSessionId ?? sessionId
    const currentFilters = options?.nextFilters ?? filters
    const requestedPageSize = options?.nextPageSize ?? pageSize
    const requestedPage = Math.max(1, options?.nextPage ?? page)
    const requestedOffset = (requestedPage - 1) * requestedPageSize

    setSearching(true)
    setError(null)

    try {
      let payload = await searchProducts({
        query: normalizedQuery,
        customerId,
        sessionId: currentSession,
        limit: requestedPageSize,
        offset: requestedOffset,
        includeDebug,
        filters: currentFilters,
      })

      let resolvedPage = requestedPage
      const maxPage = Math.max(1, Math.ceil(Math.max(payload.totalCount, 1) / requestedPageSize))
      if (payload.totalCount > 0 && requestedPage > maxPage) {
        resolvedPage = maxPage
        payload = await searchProducts({
          query: normalizedQuery,
          customerId,
          sessionId: currentSession,
          limit: requestedPageSize,
          offset: (resolvedPage - 1) * requestedPageSize,
          includeDebug,
          filters: currentFilters,
        })
      }

      if (options?.capturePrevious && searchState) {
        setPreviousSearchState(searchState)
      }
      setSearchState(payload)
      setPage(resolvedPage)
      setPageSize(requestedPageSize)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось выполнить поиск.')
    } finally {
      setSearching(false)
    }
  }

  async function handleUpload() {
    setDatasetBusy(true)
    setError(null)
    try {
      const result = await uploadDatasets(mode, steFile, contractsFile)
      await pollJob(result.jobId)
      setMetrics(null)
      resetSearchState()
      await refreshAll()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось выполнить дозагрузку.')
    } finally {
      setDatasetBusy(false)
    }
  }

  async function handleBootstrap() {
    setDatasetBusy(true)
    setError(null)
    try {
      const result = await bootstrapDefaultDataset()
      if (!result.jobId) {
        throw new Error(result.message || 'Сервер не вернул идентификатор задачи.')
      }
      await pollJob(result.jobId)
      setMetrics(null)
      resetSearchState()
      await refreshAll()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось загрузить базовый датасет.')
    } finally {
      setDatasetBusy(false)
    }
  }

  async function handleClear() {
    if (!window.confirm('Очистить текущую базу и индекс?')) {
      return
    }

    setDatasetBusy(true)
    setError(null)
    try {
      await clearDataset()
      setJobState(null)
      setSteFile(null)
      setContractsFile(null)
      setMetrics(null)
      resetSearchState()
      await refreshAll()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось очистить базу.')
    } finally {
      setDatasetBusy(false)
    }
  }

  async function handleResultEvent(
    eventType: string,
    result: SearchResult,
    position: number,
    openDialog = false,
  ) {
    const normalizedQuery = query.trim()
    if (!normalizedQuery) {
      setError('Нельзя отправить событие без исходного поискового запроса.')
      return
    }

    if (openDialog) {
      setActiveResult(result)
    }

    setError(null)
    try {
      await sendEvent({
        sessionId,
        customerId: selectedCustomer || null,
        eventType,
        productId: result.product.id,
        query: normalizedQuery,
        position,
      })
      await executeSearch({ capturePrevious: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось записать событие.')
    }
  }

  function handleProfileChange(nextCustomerId: string) {
    const nextSessionId = createSessionId()
    setSelectedCustomer(nextCustomerId)
    setSessionId(nextSessionId)
    setPage(1)
    setActiveResult(null)
    if (searchState && query.trim()) {
      void executeSearch({
        nextCustomerId,
        nextSessionId,
        capturePrevious: true,
        nextPage: 1,
      })
    }
  }

  function updateFilters(nextFilters: SearchFilters) {
    setFilters(nextFilters)
    setPage(1)
    if (searchState && query.trim()) {
      void executeSearch({
        nextFilters,
        capturePrevious: true,
        nextPage: 1,
      })
    }
  }

  function handleFilterToggle(group: keyof SearchFilters, value: string, checked: boolean) {
    const nextFilters: SearchFilters = {
      ...filters,
      [group]: toggleArrayValue(filters[group], value, checked),
    }
    if ((nextFilters[group]?.length ?? 0) === 0) {
      delete nextFilters[group]
    }
    updateFilters(nextFilters)
  }

  function clearAllFilters() {
    updateFilters({})
  }

  function startSearch() {
    void executeSearch({ nextPage: 1 })
  }

  function startNewSession() {
    const nextSessionId = createSessionId()
    setSessionId(nextSessionId)
    setPage(1)
    if (searchState && query.trim()) {
      void executeSearch({
        nextSessionId,
        capturePrevious: true,
        nextPage: 1,
      })
    }
  }

  function openDetails(result: SearchResult) {
    setActiveResult(result)
  }

  function closeDetails() {
    setActiveResult(null)
  }

  function getResultPosition(result: SearchResult) {
    const index = searchState?.results.findIndex((item) => item.product.id === result.product.id) ?? -1
    return index >= 0 && searchState ? searchState.offset + index + 1 : 1
  }

  return {
    health,
    summary,
    profiles,
    metrics,
    metricsLoading,
    loadingData,
    error,
    mode,
    steFile,
    contractsFile,
    jobState,
    datasetBusy,
    query,
    selectedCustomer,
    sessionId,
    filters,
    searchState,
    searching,
    activeResult,
    comparisonRows,
    categoryFacets,
    brandFacets,
    attributeFacets,
    profileSummary,
    selectedProfile,
    currentPage,
    totalPages,
    hasDataset,
    activeFilterCount,
    displayedJob,
    pageSize,
    setMode,
    setSteFile,
    setContractsFile,
    setQuery,
    refreshAll,
    refreshMetrics,
    handleUpload,
    handleBootstrap,
    handleClear,
    handleProfileChange,
    handleFilterToggle,
    clearAllFilters,
    startSearch,
    startNewSession,
    openDetails,
    closeDetails,
    executeSearch,
    handleResultEvent,
    getResultPosition,
  }
}

export type WorkspaceModel = ReturnType<typeof useWorkspaceModel>
