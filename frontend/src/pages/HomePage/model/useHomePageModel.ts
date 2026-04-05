import { useDeferredValue, useEffect, useMemo, useState } from 'react'

import {
  analyzeSearchQuery,
  bootstrapDefaultDataset,
  clearDataset,
  getDatasetSummary,
  getDemoProfiles,
  getHealth,
  getJob,
  getMetrics,
  getRecommendations,
  searchProducts,
  sendEvent,
  uploadDatasets,
  type DatasetJob,
  type DatasetSummary,
  type DemoProfile,
  type Health,
  type MetricsSummary,
  type SearchAnalysisResponse,
  type SearchFilters,
  type SearchResponse,
  type SearchResult,
  type UploadMode,
} from '@/shared/api'
import { pageSizeOptions, type TabId } from '@/shared/constants/search'
import { countActiveFilters, createSessionId, toggleArrayValue } from '@/shared/lib/search'

type ExecuteSearchOptions = {
  capturePrevious?: boolean
  nextCustomerId?: string
  nextSessionId?: string
  nextFilters?: SearchFilters
  nextPage?: number
  nextPageSize?: number
  targetTab?: TabId
}

const STORAGE_KEYS = {
  customerId: 'smart-search.customerId',
  sessionId: 'smart-search.sessionId',
  pageSize: 'smart-search.pageSize',
  includeDebug: 'smart-search.includeDebug',
} as const

function readStoredString(key: string, fallback: string) {
  if (typeof window === 'undefined') {
    return fallback
  }
  const value = window.localStorage.getItem(key)
  return value && value.trim().length > 0 ? value : fallback
}

function readStoredNumber(key: string, fallback: number) {
  if (typeof window === 'undefined') {
    return fallback
  }
  const value = Number(window.localStorage.getItem(key))
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function readStoredBoolean(key: string, fallback: boolean) {
  if (typeof window === 'undefined') {
    return fallback
  }
  const value = window.localStorage.getItem(key)
  if (value == null) {
    return fallback
  }
  return value === 'true'
}

export function useHomePageModel() {
  const [activeTab, setActiveTab] = useState<TabId>('search')
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

  const [query, setQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(() =>
    readStoredString(STORAGE_KEYS.customerId, ''),
  )
  const [sessionId, setSessionId] = useState(() =>
    readStoredString(STORAGE_KEYS.sessionId, createSessionId()),
  )
  const [includeDebug, setIncludeDebug] = useState(() =>
    readStoredBoolean(STORAGE_KEYS.includeDebug, true),
  )
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(() =>
    readStoredNumber(STORAGE_KEYS.pageSize, pageSizeOptions[0]),
  )
  const [filters, setFilters] = useState<SearchFilters>({})
  const [searchState, setSearchState] = useState<SearchResponse | null>(null)
  const [previousSearchState, setPreviousSearchState] = useState<SearchResponse | null>(null)
  const [analysis, setAnalysis] = useState<SearchAnalysisResponse | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [activeResult, setActiveResult] = useState<SearchResult | null>(null)

  const deferredQuery = useDeferredValue(query.trim())
  const hasDataset = (summary?.counts.products ?? 0) > 0
  const isFeedMode = query.trim().length === 0
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

  const interpretation = isFeedMode
    ? null
    : searchState
      ? {
          correctedQuery: searchState.correctedQuery,
          queryInterpretation: searchState.queryInterpretation,
          appliedSynonyms: searchState.appliedSynonyms,
          searchTermsUsed: searchState.searchTermsUsed,
        }
      : analysis
        ? {
            correctedQuery: analysis.correctedQuery,
            queryInterpretation: analysis.queryInterpretation,
            appliedSynonyms: analysis.appliedSynonyms,
            searchTermsUsed: analysis.searchTermsUsed,
          }
        : null

  const categoryFacets = isFeedMode ? [] : searchState?.facets?.categories ?? []
  const brandFacets = isFeedMode ? [] : searchState?.facets?.brands ?? []
  const attributeFacets = isFeedMode ? [] : searchState?.facets?.attributes ?? []
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    if (selectedCustomer) {
      window.localStorage.setItem(STORAGE_KEYS.customerId, selectedCustomer)
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.customerId)
    }
  }, [selectedCustomer])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    window.localStorage.setItem(STORAGE_KEYS.sessionId, sessionId)
  }, [sessionId])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    window.localStorage.setItem(STORAGE_KEYS.pageSize, String(pageSize))
  }, [pageSize])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    window.localStorage.setItem(STORAGE_KEYS.includeDebug, String(includeDebug))
  }, [includeDebug])

  useEffect(() => {
    if (!deferredQuery) {
      setAnalysis(null)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setAnalysisLoading(true)
      try {
        const payload = await analyzeSearchQuery({ query: deferredQuery })
        if (!controller.signal.aborted) {
          setAnalysis(payload)
        }
      } catch {
        if (!controller.signal.aborted) {
          setAnalysis(null)
        }
      } finally {
        if (!controller.signal.aborted) {
          setAnalysisLoading(false)
        }
      }
    }, 220)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [deferredQuery])

  useEffect(() => {
    if (activeTab === 'metrics' && !metrics && !metricsLoading) {
      void refreshMetrics()
    }
  }, [activeTab, metrics, metricsLoading])

  useEffect(() => {
    if (activeTab !== 'search' || !hasDataset || !isFeedMode) {
      return
    }
    void loadRecommendations({
      nextPage: 1,
      nextCustomerId: selectedCustomer || undefined,
      nextSessionId: sessionId,
      targetTab: 'search',
    })
  }, [activeTab, hasDataset, isFeedMode, selectedCustomer, sessionId])

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
      setSelectedCustomer(selectedStillValid ? selectedCustomer : (profilesResult[0]?.customerId ?? ''))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось загрузить состояние системы.')
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
    setQuery('')
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

  async function loadRecommendations(options?: Omit<ExecuteSearchOptions, 'nextFilters'>) {
    const customerId = options?.nextCustomerId ?? (selectedCustomer || null)
    const currentSession = options?.nextSessionId ?? sessionId
    const requestedPageSize = options?.nextPageSize ?? pageSize
    const requestedPage = Math.max(1, options?.nextPage ?? page)
    const requestedOffset = (requestedPage - 1) * requestedPageSize

    setSearching(true)
    setError(null)

    try {
      let payload = await getRecommendations({
        customerId,
        sessionId: currentSession,
        limit: requestedPageSize,
        offset: requestedOffset,
        includeDebug,
      })

      let resolvedPage = requestedPage
      const maxPage = Math.max(1, Math.ceil(Math.max(payload.totalCount, 1) / requestedPageSize))
      if (payload.totalCount > 0 && requestedPage > maxPage) {
        resolvedPage = maxPage
        payload = await getRecommendations({
          customerId,
          sessionId: currentSession,
          limit: requestedPageSize,
          offset: (resolvedPage - 1) * requestedPageSize,
          includeDebug,
        })
      }

      if (options?.capturePrevious && searchState) {
        setPreviousSearchState(searchState)
      }
      setFilters({})
      setSearchState(payload)
      setPage(resolvedPage)
      setPageSize(requestedPageSize)
      setActiveTab(options?.targetTab ?? 'search')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось собрать персональную витрину.')
    } finally {
      setSearching(false)
    }
  }

  async function executeSearch(options?: ExecuteSearchOptions) {
    const normalizedQuery = query.trim()
    if (!normalizedQuery) {
      await loadRecommendations(options)
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
      setActiveTab(options?.targetTab ?? 'search')
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
      setActiveTab('search')
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
      setActiveTab('search')
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
      setActiveTab('data')
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
        query: normalizedQuery || null,
        position,
      })

      if (normalizedQuery) {
        await executeSearch({ capturePrevious: true })
      } else {
        await loadRecommendations({ capturePrevious: true })
      }
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

    if (!hasDataset) {
      return
    }

    if (query.trim()) {
      void executeSearch({
        nextCustomerId,
        nextSessionId,
        capturePrevious: true,
        nextPage: 1,
      })
    } else {
      void loadRecommendations({
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
    if (searchState && !isFeedMode) {
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
    void executeSearch({ targetTab: 'search', nextPage: 1 })
  }

  function resetSearch() {
    setQuery('')
    setError(null)
    resetSearchState()
  }

  function startNewSession() {
    const nextSessionId = createSessionId()
    setSessionId(nextSessionId)
    setPage(1)

    if (!hasDataset) {
      return
    }

    if (query.trim()) {
      void executeSearch({
        nextSessionId,
        capturePrevious: true,
        nextPage: 1,
      })
    } else {
      void loadRecommendations({
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
    activeTab,
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
    includeDebug,
    filters,
    searchState,
    analysisLoading,
    searching,
    activeResult,
    comparisonRows,
    interpretation,
    categoryFacets,
    brandFacets,
    attributeFacets,
    profileSummary,
    selectedProfile,
    currentPage,
    totalPages,
    hasDataset,
    isFeedMode,
    activeFilterCount,
    displayedJob,
    pageSize,
    setActiveTab,
    setMode,
    setSteFile,
    setContractsFile,
    setQuery,
    setIncludeDebug,
    refreshAll,
    refreshMetrics,
    handleUpload,
    handleBootstrap,
    handleClear,
    handleProfileChange,
    handleFilterToggle,
    clearAllFilters,
    startSearch,
    resetSearch,
    startNewSession,
    openDetails,
    closeDetails,
    executeSearch,
    handleResultEvent,
    getResultPosition,
  }
}
