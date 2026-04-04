import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Database,
  Filter,
  FolderSync,
  Loader2,
  RefreshCcw,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react'

import {
  analyzeSearchQuery,
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
  type SearchAnalysisResponse,
  type SearchFacetBucket,
  type SearchFacetGroup,
  type SearchFilters,
  type SearchResponse,
  type SearchResult,
  type UploadMode,
} from './api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type TabId = 'search' | 'dynamics' | 'metrics' | 'data'

const incrementalModes: Array<{ value: UploadMode; label: string; description: string }> = [
  {
    value: 'upsert_ste',
    label: 'СТЕ',
    description: 'Добавить или обновить товары каталога.',
  },
  {
    value: 'append_contracts',
    label: 'Контракты',
    description: 'Дозагрузить историю закупок и перестроить профили.',
  },
  {
    value: 'upsert_bundle',
    label: 'Оба файла',
    description: 'Обновить и каталог, и историю закупок за один проход.',
  },
]

function createSessionId() {
  return `session-${Math.random().toString(36).slice(2, 10)}`
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('ru-RU').format(value ?? 0)
}

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(value ?? 0)
}

function formatMetric(value: number | null | undefined) {
  if (value == null) {
    return '0.0000'
  }
  return value.toFixed(4)
}

function countActiveFilters(filters: SearchFilters) {
  return (
    (filters.categories?.length ?? 0) +
    (filters.brands?.length ?? 0) +
    (filters.attributes?.length ?? 0)
  )
}

function asText(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function toggleArrayValue(values: string[] | undefined, value: string, checked: boolean) {
  const current = new Set(values ?? [])
  if (checked) {
    current.add(value)
  } else {
    current.delete(value)
  }
  return Array.from(current)
}

function CompactStat(props: { label: string; value: string | number; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {props.icon}
        <span>{props.label}</span>
      </div>
      <div className="mt-2 text-lg font-semibold tracking-tight">{props.value}</div>
    </div>
  )
}

function MetricDeltaCard(props: {
  label: string
  baseline: number | null | undefined
  personalized: number | null | undefined
}) {
  const baseline = props.baseline ?? 0
  const personalized = props.personalized ?? 0
  const delta = personalized - baseline
  const direction = delta >= 0 ? 'up' : 'down'

  return (
    <Card size="sm">
      <CardHeader className="pb-0">
        <CardTitle>{props.label}</CardTitle>
        <CardDescription>Baseline против персонализации</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="text-xs text-muted-foreground">Baseline</div>
            <div className="mt-1 font-medium">{formatMetric(baseline)}</div>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="text-xs text-muted-foreground">Personalized</div>
            <div className="mt-1 font-medium">{formatMetric(personalized)}</div>
          </div>
        </div>
        <div className="rounded-lg border px-3 py-2 text-sm">
          <div className="flex items-center gap-2 font-medium">
            {direction === 'up' ? (
              <ArrowUpRight className="size-4 text-emerald-600" />
            ) : (
              <ArrowDownRight className="size-4 text-destructive" />
            )}
            <span>{delta >= 0 ? '+' : ''}{delta.toFixed(4)}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${Math.max(6, Math.min(100, personalized * 100))}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FilterBucket(props: {
  checked: boolean
  bucket: SearchFacetBucket
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/40">
      <Checkbox checked={props.checked} onCheckedChange={(value) => props.onChange(Boolean(value))} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{props.bucket.value}</div>
        <div className="text-xs text-muted-foreground">{formatNumber(props.bucket.count)}</div>
      </div>
    </label>
  )
}

function SearchResultCard(props: {
  result: SearchResult
  position: number
  onOpen: () => void
  onRelevant: () => void
  onIrrelevant: () => void
  onBounce: () => void
  onSave: () => void
  onDetails: () => void
}) {
  const topFactors = props.result.scoreBreakdown?.slice(0, 3) ?? []

  return (
    <Card className="h-full border-border/80 shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">#{props.position}</Badge>
              <Badge variant="outline">{props.result.product.category}</Badge>
              {props.result.product.brandGuess ? (
                <Badge variant="outline">{props.result.product.brandGuess}</Badge>
              ) : null}
            </div>
            <CardTitle className="text-balance leading-6">{props.result.product.title}</CardTitle>
          </div>
          <CardAction>
            <div className="rounded-lg border bg-muted/40 px-3 py-1.5 text-right">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">score</div>
              <div className="text-sm font-semibold">{props.result.score.toFixed(2)}</div>
            </div>
          </CardAction>
        </div>
        <CardDescription>{props.result.explanation}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {props.result.product.attributes.slice(0, 5).map((attribute) => (
            <Badge
              key={`${props.result.product.id}-${attribute.name}-${attribute.value}`}
              variant="secondary"
              className="max-w-full"
            >
              <span className="truncate">
                {attribute.name}: {attribute.value}
              </span>
            </Badge>
          ))}
        </div>
        {topFactors.length > 0 ? (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Факторы ранжирования
            </div>
            <div className="space-y-2 text-sm">
              {topFactors.map((factor) => (
                <div
                  key={`${props.result.product.id}-${factor.type}-${factor.reason}`}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 text-balance text-foreground/90">{factor.reason}</div>
                  <div className="shrink-0 font-medium text-foreground/70">
                    +{factor.value.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={props.onOpen}>
          Открыть
        </Button>
        <Button size="sm" variant="outline" onClick={props.onRelevant}>
          Релевантно
        </Button>
        <Button size="sm" variant="outline" onClick={props.onSave}>
          Сохранить
        </Button>
        <Button size="sm" variant="outline" onClick={props.onDetails}>
          Детали
        </Button>
        <Button size="sm" variant="outline" onClick={props.onBounce}>
          Быстрый возврат
        </Button>
        <Button size="sm" variant="destructive" onClick={props.onIrrelevant}>
          Не релевантно
        </Button>
      </CardFooter>
    </Card>
  )
}

function App() {
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

  const [query, setQuery] = useState('aktirf smartbuy 16')
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [sessionId, setSessionId] = useState(createSessionId())
  const [includeDebug, setIncludeDebug] = useState(true)
  const [filters, setFilters] = useState<SearchFilters>({})
  const [searchState, setSearchState] = useState<SearchResponse | null>(null)
  const [previousSearchState, setPreviousSearchState] = useState<SearchResponse | null>(null)
  const [analysis, setAnalysis] = useState<SearchAnalysisResponse | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [activeResult, setActiveResult] = useState<SearchResult | null>(null)

  const deferredQuery = useDeferredValue(query.trim())
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

  const interpretation = searchState
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

  useEffect(() => {
    void refreshAll()
  }, [])

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

  async function executeSearch(options?: {
    capturePrevious?: boolean
    nextCustomerId?: string
    nextSessionId?: string
    nextFilters?: SearchFilters
    targetTab?: TabId
  }) {
    const normalizedQuery = query.trim()
    if (!normalizedQuery) {
      setError('Введите поисковый запрос хотя бы из одного символа.')
      return
    }

    const customerId = options?.nextCustomerId ?? (selectedCustomer || null)
    const currentSession = options?.nextSessionId ?? sessionId
    const currentFilters = options?.nextFilters ?? filters

    setSearching(true)
    setError(null)

    try {
      const payload = await searchProducts({
        query: normalizedQuery,
        customerId,
        sessionId: currentSession,
        limit: 12,
        offset: 0,
        includeDebug,
        filters: currentFilters,
      })

      if (options?.capturePrevious && searchState) {
        setPreviousSearchState(searchState)
      }
      setSearchState(payload)
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
    setActiveResult(null)
    if (searchState && query.trim()) {
      void executeSearch({
        nextCustomerId,
        nextSessionId,
        capturePrevious: true,
      })
    }
  }

  function updateFilters(nextFilters: SearchFilters) {
    setFilters(nextFilters)
    if (searchState && query.trim()) {
      void executeSearch({
        nextFilters,
        capturePrevious: true,
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

  const categoryFacets = searchState?.facets?.categories ?? []
  const brandFacets = searchState?.facets?.brands ?? []
  const attributeFacets = searchState?.facets?.attributes ?? []
  const profileSummary = searchState?.profileSummary
  const selectedProfile = profiles.find((profile) => profile.customerId === selectedCustomer) ?? null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8">
        <header className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline">Smart Product Search</Badge>
                <Badge variant={health?.status === 'healthy' ? 'secondary' : 'destructive'}>
                  {health?.status ?? 'offline'}
                </Badge>
                {loadingData ? <Badge variant="secondary">Обновляем состояние</Badge> : null}
              </div>
              <CardTitle className="text-2xl tracking-tight">Поиск и персонализация СТЕ</CardTitle>
              <CardDescription>
                Основной экран для демо: поиск, динамические фильтры, профили заказчиков и
                живая перестройка выдачи после действий пользователя.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <CompactStat
                label="Товаров в индексе"
                value={formatNumber(summary?.counts.products)}
                icon={<Database className="size-3.5" />}
              />
              <CompactStat
                label="Контрактов"
                value={formatNumber(summary?.counts.contracts)}
                icon={<FolderSync className="size-3.5" />}
              />
              <CompactStat
                label="Профилей"
                value={formatNumber(summary?.counts.profiles)}
                icon={<UserRound className="size-3.5" />}
              />
              <CompactStat
                label="Версия backend"
                value={health?.version ?? 'n/a'}
                icon={<BadgeCheck className="size-3.5" />}
              />
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>Текущий контекст</CardTitle>
              <CardDescription>
                Поиск идет по FTS5, затем ранжирование меняется историей контрактов и событиями
                текущей сессии.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border bg-muted/40 p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Текущая сессия
                </div>
                <div className="mt-2 font-medium">{sessionId}</div>
              </div>
              <div className="rounded-xl border bg-muted/40 p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Выбранный профиль
                </div>
                <div className="mt-2 text-sm font-medium">
                  {selectedProfile?.summary.customerName ?? 'Профиль не выбран'}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {selectedProfile?.customerId ?? 'Без customerId'}
                </div>
              </div>
              <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                {searchState
                  ? `Последний поиск: ${searchState.totalCount} результатов, API ${searchState.timingsMs.total} ms`
                  : 'Пока нет активного поискового ответа. Выполни запрос или переключи профиль после поиска.'}
              </div>
            </CardContent>
          </Card>
        </header>

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabId)}>
          <TabsList variant="line" className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="search">Поиск</TabsTrigger>
            <TabsTrigger value="dynamics">Динамика</TabsTrigger>
            <TabsTrigger value="metrics">Метрики</TabsTrigger>
            <TabsTrigger value="data">Данные</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle>Поисковый запрос</CardTitle>
                <CardDescription>
                  Здесь система сразу показывает раскладку, исправления опечаток, синонимы и
                  фактические токены, которыми ищет в индексе.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_280px_180px]">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Запрос</label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            void executeSearch({ targetTab: 'search' })
                          }
                        }}
                        placeholder="Например: aktirf smartbuy 16"
                        className="h-11 pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Профиль заказчика</label>
                    <Select value={selectedCustomer} onValueChange={handleProfileChange}>
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue placeholder="Выберите профиль" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.length === 0 ? (
                          <SelectItem value="__empty" disabled>
                            Нет профилей
                          </SelectItem>
                        ) : (
                          profiles.map((profile) => (
                            <SelectItem key={profile.customerId} value={profile.customerId}>
                              {profile.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col justify-end gap-2">
                    <Button
                      className="h-11"
                      disabled={!hasDataset || searching || query.trim().length === 0}
                      onClick={() => void executeSearch({ targetTab: 'search' })}
                    >
                      {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                      Искать
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11"
                      onClick={() => {
                        const nextSessionId = createSessionId()
                        setSessionId(nextSessionId)
                        if (searchState && query.trim()) {
                          void executeSearch({
                            nextSessionId,
                            capturePrevious: true,
                          })
                        }
                      }}
                    >
                      <RefreshCcw className="size-4" />
                      Новая сессия
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={includeDebug}
                      onCheckedChange={(value) => setIncludeDebug(Boolean(value))}
                    />
                    Показывать факторы ранжирования
                  </label>
                  {analysisLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Разбираем запрос
                    </div>
                  ) : null}
                </div>

                {interpretation ? (
                  <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
                    <div className="rounded-xl border bg-muted/30 p-4">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Исправление запроса
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">Оригинал</div>
                      <div className="mt-1 font-medium">{query.trim() || '—'}</div>
                      <div className="mt-3 text-sm text-muted-foreground">Будем искать как</div>
                      <div className="mt-1 text-lg font-semibold">
                        {interpretation.correctedQuery || '—'}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {interpretation.queryInterpretation.layoutCorrections.map((entry, index) => (
                          <Badge key={`layout-${index}`} variant="outline">
                            {asText(entry.from)} → {asText(entry.to)}
                          </Badge>
                        ))}
                        {interpretation.queryInterpretation.typoCorrections.map((entry, index) => (
                          <Badge key={`typo-${index}`} variant="outline">
                            {asText(entry.from)} → {asText(entry.to)}
                          </Badge>
                        ))}
                        {interpretation.queryInterpretation.synonymMappings.map((entry, index) => (
                          <Badge key={`synonym-${index}`} variant="secondary">
                            {asText(entry.from)} → {asText(entry.to)}
                          </Badge>
                        ))}
                        {interpretation.queryInterpretation.layoutCorrections.length === 0 &&
                        interpretation.queryInterpretation.typoCorrections.length === 0 &&
                        interpretation.queryInterpretation.synonymMappings.length === 0 ? (
                          <span className="text-sm text-muted-foreground">
                            Дополнительных исправлений не потребовалось.
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-xl border bg-muted/30 p-4">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Что реально использовано при поиске
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {interpretation.searchTermsUsed.map((term) => (
                          <Badge key={term}>{term}</Badge>
                        ))}
                        {interpretation.searchTermsUsed.length === 0 ? (
                          <span className="text-sm text-muted-foreground">Токены еще не готовы.</span>
                        ) : null}
                      </div>
                      <Separator className="my-4" />
                      <div className="text-sm text-muted-foreground">Синонимы</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {interpretation.appliedSynonyms.map((value) => (
                          <Badge key={value} variant="secondary">
                            {value}
                          </Badge>
                        ))}
                        {interpretation.appliedSynonyms.length === 0 ? (
                          <span className="text-sm text-muted-foreground">
                            Синонимы в этом запросе не понадобились.
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {!hasDataset ? (
              <Card className="border-border/80 shadow-sm">
                <CardContent className="py-10">
                  <div className="mx-auto max-w-xl text-center">
                    <div className="text-lg font-semibold">Индекс пока пустой</div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Сначала загрузи встроенный датасет или дозагрузи свои CSV на вкладке
                      «Данные».
                    </p>
                    <div className="mt-4">
                      <Button variant="outline" onClick={() => setActiveTab('data')}>
                        <Database className="size-4" />
                        Перейти к данным
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <div className="space-y-6">
                  <Card className="border-border/80 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Filter className="size-4" />
                        Динамические фильтры
                      </CardTitle>
                      <CardDescription>
                        Пересчитываются по текущей выдаче и сразу влияют на следующий запрос.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{activeFilterCount} активных</Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={activeFilterCount === 0}
                          onClick={clearAllFilters}
                        >
                          Сбросить
                        </Button>
                      </div>

                      <ScrollArea className="h-[560px] pr-3">
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Категории</div>
                            {categoryFacets.length === 0 ? (
                              <div className="text-sm text-muted-foreground">Нет данных</div>
                            ) : (
                              categoryFacets.map((bucket) => (
                                <FilterBucket
                                  key={`category-${bucket.value}`}
                                  bucket={bucket}
                                  checked={(filters.categories ?? []).includes(bucket.value)}
                                  onChange={(checked) =>
                                    handleFilterToggle('categories', bucket.value, checked)
                                  }
                                />
                              ))
                            )}
                          </div>

                          <Separator />

                          <div className="space-y-2">
                            <div className="text-sm font-medium">Бренды</div>
                            {brandFacets.length === 0 ? (
                              <div className="text-sm text-muted-foreground">Нет данных</div>
                            ) : (
                              brandFacets.map((bucket) => (
                                <FilterBucket
                                  key={`brand-${bucket.value}`}
                                  bucket={bucket}
                                  checked={(filters.brands ?? []).includes(bucket.value)}
                                  onChange={(checked) =>
                                    handleFilterToggle('brands', bucket.value, checked)
                                  }
                                />
                              ))
                            )}
                          </div>

                          {attributeFacets.map((group: SearchFacetGroup) => (
                            <div key={group.name} className="space-y-2">
                              <Separator />
                              <div className="text-sm font-medium">{group.name}</div>
                              {group.values.map((bucket) => (
                                <FilterBucket
                                  key={bucket.key ?? `${group.name}-${bucket.value}`}
                                  bucket={bucket}
                                  checked={(filters.attributes ?? []).includes(
                                    bucket.key ?? `${group.name}::${bucket.value}`,
                                  )}
                                  onChange={(checked) =>
                                    handleFilterToggle(
                                      'attributes',
                                      bucket.key ?? `${group.name}::${bucket.value}`,
                                      checked,
                                    )
                                  }
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  <Card className="border-border/80 shadow-sm">
                    <CardHeader>
                      <CardTitle>Профиль заказчика</CardTitle>
                      <CardDescription>
                        Меняется сразу при переключении профиля и влияет на ранжирование без
                        перезапуска сервера.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {profileSummary ? (
                        <>
                          <div className="rounded-xl border bg-muted/30 p-4">
                            <div className="font-medium">{profileSummary.customerName}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {profileSummary.customerId}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-xl border px-3 py-3">
                              <div className="text-xs text-muted-foreground">Закупок</div>
                              <div className="mt-1 font-semibold">
                                {formatNumber(profileSummary.purchaseCount)}
                              </div>
                            </div>
                            <div className="rounded-xl border px-3 py-3">
                              <div className="text-xs text-muted-foreground">Совпало с профилем</div>
                              <div className="mt-1 font-semibold">
                                {formatNumber(profileSummary.matchedPurchaseCount)}
                              </div>
                            </div>
                            <div className="rounded-xl border px-3 py-3">
                              <div className="text-xs text-muted-foreground">Сумма контрактов</div>
                              <div className="mt-1 font-semibold">
                                {formatMoney(profileSummary.totalSpend)}
                              </div>
                            </div>
                            <div className="rounded-xl border px-3 py-3">
                              <div className="text-xs text-muted-foreground">Последняя закупка</div>
                              <div className="mt-1 font-semibold">
                                {profileSummary.lastPurchaseAt ?? '—'}
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="mb-2 text-sm font-medium">Топ категорий</div>
                            <div className="flex flex-wrap gap-2">
                              {profileSummary.topCategories.slice(0, 6).map((item) => (
                                <Badge key={`category-${item.value}`} variant="secondary">
                                  {item.value}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          После поиска здесь появится краткий профиль выбранного заказчика.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold">Выдача</div>
                      <div className="text-sm text-muted-foreground">
                        {searchState
                          ? `${formatNumber(searchState.totalCount)} результатов, показано ${searchState.results.length}`
                          : 'Сначала выполни поиск.'}
                      </div>
                    </div>
                    {searchState ? (
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Normalize {searchState.timingsMs.normalize} ms</Badge>
                        <Badge variant="outline">Retrieve {searchState.timingsMs.retrieve} ms</Badge>
                        <Badge variant="outline">Rerank {searchState.timingsMs.rerank} ms</Badge>
                        <Badge>Total {searchState.timingsMs.total} ms</Badge>
                      </div>
                    ) : null}
                  </div>

                  {searching && !searchState ? (
                    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <Card key={`skeleton-${index}`} className="border-border/80 shadow-sm">
                          <CardHeader>
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-8 w-full" />
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-20 w-full" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : null}

                  {searchState && searchState.results.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                      {searchState.results.map((result, index) => (
                        <SearchResultCard
                          key={result.product.id}
                          result={result}
                          position={index + 1}
                          onOpen={() => void handleResultEvent('result_opened', result, index + 1, true)}
                          onRelevant={() => void handleResultEvent('marked_relevant', result, index + 1)}
                          onIrrelevant={() => void handleResultEvent('marked_irrelevant', result, index + 1)}
                          onBounce={() => void handleResultEvent('result_bounced', result, index + 1)}
                          onSave={() => void handleResultEvent('result_saved', result, index + 1)}
                          onDetails={() => setActiveResult(result)}
                        />
                      ))}
                    </div>
                  ) : null}

                  {searchState && searchState.results.length === 0 ? (
                    <Card className="border-border/80 shadow-sm">
                      <CardContent className="py-12 text-center">
                        <div className="text-lg font-semibold">Ничего не найдено</div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Попробуй убрать часть фильтров или изменить запрос.
                        </p>
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="dynamics" className="space-y-6">
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle>Как меняется выдача</CardTitle>
                <CardDescription>
                  Здесь видно, как ранжирование перестраивается после действий пользователя в той
                  же сессии.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {comparisonRows.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Сначала выполни поиск, затем отметь карточку как релевантную, нерелевантную
                    или сделай быстрый возврат.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {comparisonRows.map((row) => (
                      <div key={row.id} className="rounded-xl border bg-card p-4">
                        <div className="text-sm font-medium text-balance">{row.title}</div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                          <div className="rounded-lg border bg-muted/30 px-2 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Было
                            </div>
                            <div className="mt-1 font-semibold">{row.before ?? 'new'}</div>
                          </div>
                          <div className="rounded-lg border bg-muted/30 px-2 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Стало
                            </div>
                            <div className="mt-1 font-semibold">{row.after}</div>
                          </div>
                          <div className="rounded-lg border bg-muted/30 px-2 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Δ
                            </div>
                            <div className="mt-1 flex items-center justify-center gap-1 font-semibold">
                              {row.delta == null ? (
                                'new'
                              ) : row.delta > 0 ? (
                                <>
                                  <ArrowUpRight className="size-4 text-emerald-600" />
                                  {row.delta}
                                </>
                              ) : row.delta < 0 ? (
                                <>
                                  <ArrowDownRight className="size-4 text-destructive" />
                                  {Math.abs(row.delta)}
                                </>
                              ) : (
                                '0'
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle>Метрики качества</CardTitle>
                <CardDescription>
                  Сравнение базового поиска и персонализированной выдачи на тех же данных.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Card key={`metric-skeleton-${index}`} size="sm">
                        <CardHeader>
                          <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <Skeleton className="h-5 w-20" />
                          <Skeleton className="h-2 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : metrics ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <MetricDeltaCard
                        label="NDCG@10"
                        baseline={metrics.baseline.ndcgAt10}
                        personalized={metrics.personalized.ndcgAt10}
                      />
                      <MetricDeltaCard
                        label="MRR@10"
                        baseline={metrics.baseline.mrrAt10}
                        personalized={metrics.personalized.mrrAt10}
                      />
                      <MetricDeltaCard
                        label="Recall@20"
                        baseline={metrics.baseline.recallAt20}
                        personalized={metrics.personalized.recallAt20}
                      />
                      <MetricDeltaCard
                        label="Success@5"
                        baseline={metrics.baseline.successAt5}
                        personalized={metrics.personalized.successAt5}
                      />
                    </div>
                    <div className="grid gap-4 lg:grid-cols-3">
                      <CompactStat label="Товаров" value={formatNumber(metrics.dataset.products)} />
                      <CompactStat
                        label="Контрактов"
                        value={formatNumber(metrics.dataset.contracts)}
                      />
                      <CompactStat label="Профилей" value={formatNumber(metrics.dataset.profiles)} />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Метрики будут подгружены при открытии вкладки.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
              <Card className="border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle>Быстрый старт</CardTitle>
                  <CardDescription>
                    Загрузка встроенного датасета из папки проекта, без ручного выбора CSV.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                    Используй этот режим перед защитой, чтобы быстро поднять систему на полном
                    наборе данных.
                  </div>
                  <Button className="w-full" disabled={datasetBusy} onClick={() => void handleBootstrap()}>
                    {datasetBusy ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
                    Загрузить встроенный датасет
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle>Очистка базы</CardTitle>
                  <CardDescription>
                    Полностью очищает SQLite-базу и индекс, чтобы начать с чистого состояния.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                    Полезно, если нужно быстро перепроверить сценарий первой загрузки или заменить
                    датасет перед новой демонстрацией.
                  </div>
                  <Button
                    className="w-full"
                    variant="destructive"
                    disabled={datasetBusy}
                    onClick={() => void handleClear()}
                  >
                    {datasetBusy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    Очистить текущую базу
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle>Дозагрузка данных</CardTitle>
                <CardDescription>
                  Для новых файлов заказчика: выбор режима, загрузка CSV и отслеживание фоновой
                  обработки.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 xl:grid-cols-[220px_1fr_1fr_auto] xl:items-end">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Режим</label>
                  <Select value={mode} onValueChange={(value) => setMode(value as UploadMode)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {incrementalModes.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {incrementalModes.find((item) => item.value === mode)?.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Файл СТЕ</label>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(event) => setSteFile(event.target.files?.[0] ?? null)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Файл контрактов</label>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(event) => setContractsFile(event.target.files?.[0] ?? null)}
                  />
                </div>

                <Button
                  className="h-10"
                  disabled={
                    datasetBusy ||
                    (mode === 'upsert_ste' && !steFile) ||
                    (mode === 'append_contracts' && !contractsFile) ||
                    (mode === 'upsert_bundle' && (!steFile || !contractsFile))
                  }
                  onClick={() => void handleUpload()}
                >
                  {datasetBusy ? <Loader2 className="size-4 animate-spin" /> : <FolderSync className="size-4" />}
                  Запустить
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle>Статус импорта</CardTitle>
                <CardDescription>
                  Последняя активная или успешная задача обработки датасета.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {displayedJob ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <CompactStat label="Job ID" value={displayedJob.jobId} />
                      <CompactStat label="Статус" value={displayedJob.status} />
                      <CompactStat label="Режим" value={displayedJob.mode} />
                      <CompactStat label="Прогресс" value={`${Math.round(displayedJob.progress)}%`} />
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${Math.max(4, Math.min(100, displayedJob.progress))}%` }}
                      />
                    </div>
                    {displayedJob.warnings.length > 0 ? (
                      <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
                        <div className="text-sm font-medium">Warnings</div>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {displayedJob.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {displayedJob.errors.length > 0 ? (
                      <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                        <div className="text-sm font-medium text-destructive">Errors</div>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
                          {displayedJob.errors.map((message) => (
                            <li key={message}>{message}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Задач обработки пока не было.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={Boolean(activeResult)} onOpenChange={(open) => !open && setActiveResult(null)}>
        <DialogContent className="max-w-3xl">
          {activeResult ? (
            <>
              <DialogHeader>
                <DialogTitle>{activeResult.product.title}</DialogTitle>
                <DialogDescription>
                  {activeResult.product.category}
                  {activeResult.product.brandGuess ? ` · ${activeResult.product.brandGuess}` : ''}
                  {activeResult.product.modelGuess ? ` · ${activeResult.product.modelGuess}` : ''}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Почему карточка поднялась
                    </div>
                    <div className="mt-2 text-sm text-balance">{activeResult.explanation}</div>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Характеристики
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeResult.product.attributes.map((attribute) => (
                        <Badge
                          key={`${activeResult.product.id}-${attribute.name}-${attribute.value}`}
                          variant="secondary"
                        >
                          {attribute.name}: {attribute.value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Score
                    </div>
                    <div className="mt-2 text-2xl font-semibold">{activeResult.score.toFixed(2)}</div>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Детализация ранжирования
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      {(activeResult.scoreBreakdown ?? []).map((factor) => (
                        <div
                          key={`${activeResult.product.id}-${factor.type}-${factor.reason}`}
                          className="flex items-start justify-between gap-3 rounded-lg border bg-background px-3 py-2"
                        >
                          <div className="min-w-0 text-balance">{factor.reason}</div>
                          <div className="shrink-0 font-medium">+{factor.value.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void handleResultEvent('marked_relevant', activeResult, 1)}>
                      Релевантно
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => void handleResultEvent('marked_irrelevant', activeResult, 1)}
                    >
                      Не релевантно
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
