import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  CornerUpLeft,
  Database,
  Filter,
  FolderSync,
  Info,
  Loader2,
  Eye,
  RefreshCcw,
  Search,
  ThumbsDown,
  ThumbsUp,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

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

const PAGE_SIZE_OPTIONS = [12, 24, 48]

const ACTION_DETAILS = {
  open: {
    label: 'Открыть',
    description: 'Открывает карточку товара и дает мягкий положительный сигнал текущему товару.',
    impact: 'Поднимает этот товар и похожие позиции в текущей сессии.',
  },
  details: {
    label: 'Детали',
    description: 'Открывает полную карточку без оценочного сигнала.',
    impact: 'На ранжирование не влияет.',
  },
  relevant: {
    label: 'Релевантно',
    description: 'Сильный положительный сигнал: результат подошел.',
    impact: 'Заметно поднимает товар и его категорию в текущей сессии.',
  },
  save: {
    label: 'Сохранить',
    description: 'Промежуточный положительный сигнал: товар пригодился для дальнейшей работы.',
    impact: 'Добавляет умеренный положительный вес для этого товара.',
  },
  bounce: {
    label: 'Быстрый возврат',
    description: 'Негативный сигнал: карточку открыли, но быстро вернулись к поиску.',
    impact: 'Понижает этот товар и слегка ослабляет похожую категорию.',
  },
  irrelevant: {
    label: 'Не релевантно',
    description: 'Сильный отрицательный сигнал: результат не соответствует запросу.',
    impact: 'Сильно понижает товар и связанные позиции в текущей сессии.',
  },
} as const

function createSessionId() {
  return `session-${Math.random().toString(36).slice(2, 10)}`
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

function formatSignedScore(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`
}

function buildVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
  if (currentPage <= 3) {
    pages.add(2)
    pages.add(3)
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1)
    pages.add(totalPages - 2)
  }

  const sorted = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right)

  const output: Array<number | 'ellipsis'> = []
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) {
      output.push('ellipsis')
    }
    output.push(page)
  })
  return output
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

function ActionIconButton(props: {
  label: string
  description: string
  impact: string
  icon: ReactNode
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive'
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon-sm"
          variant={props.variant ?? 'outline'}
          aria-label={props.label}
          onClick={props.onClick}
        >
          {props.icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[260px] whitespace-normal">
        <div className="space-y-1">
          <div className="font-medium">{props.label}</div>
          <div className="text-[11px] text-background/80">{props.description}</div>
          <div className="text-[11px] text-background/80">{props.impact}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

function FeedbackLegend() {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Как влияют действия на карточке</CardTitle>
        <CardDescription>
          Подсказки повторяются на иконках. Положительные сигналы поднимают похожие результаты в этой
          сессии, отрицательные сразу перестраивают выдачу вниз.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[
          { key: 'open', icon: <Eye className="size-4" /> },
          { key: 'relevant', icon: <ThumbsUp className="size-4" /> },
          { key: 'save', icon: <Bookmark className="size-4" /> },
          { key: 'details', icon: <Info className="size-4" /> },
          { key: 'bounce', icon: <CornerUpLeft className="size-4" /> },
          { key: 'irrelevant', icon: <ThumbsDown className="size-4" /> },
        ].map((item) => {
          const details = ACTION_DETAILS[item.key as keyof typeof ACTION_DETAILS]
          return (
            <div key={item.key} className="rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                {item.icon}
                <span>{details.label}</span>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{details.description}</div>
              <div className="mt-2 text-xs text-foreground/80">{details.impact}</div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function SearchPagination(props: {
  currentPage: number
  totalPages: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  disabled?: boolean
}) {
  const visiblePages = buildVisiblePages(props.currentPage, props.totalPages)

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
        {`Показано ${formatNumber(props.pageSize)} на странице, всего ${formatNumber(props.totalCount)}`}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={String(props.pageSize)}
          onValueChange={(value) => props.onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="h-8 w-[92px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((value) => (
              <SelectItem key={value} value={String(value)}>
                {value} / стр.
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="icon-sm"
          variant="outline"
          disabled={props.disabled || props.currentPage <= 1}
          onClick={() => props.onPageChange(props.currentPage - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) =>
            page === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="px-2 text-sm text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={page}
                size="sm"
                variant={page === props.currentPage ? 'default' : 'outline'}
                disabled={props.disabled}
                onClick={() => props.onPageChange(page)}
              >
                {page}
              </Button>
            ),
          )}
        </div>

        <Button
          size="icon-sm"
          variant="outline"
          disabled={props.disabled || props.currentPage >= props.totalPages}
          onClick={() => props.onPageChange(props.currentPage + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
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
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">#{props.position}</Badge>
              <Badge variant="outline">{props.result.product.category}</Badge>
              {props.result.product.brandGuess ? (
                <Badge variant="outline">{props.result.product.brandGuess}</Badge>
              ) : null}
            </div>
            <CardTitle className="text-balance leading-6">{props.result.product.title}</CardTitle>
            <CardDescription className="max-w-[72ch]">{props.result.explanation}</CardDescription>
          </div>
          <CardAction className="flex max-w-[220px] flex-wrap items-start justify-end gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="rounded-xl border bg-muted/40 px-3 py-2 text-right transition-colors hover:bg-muted"
                >
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Оценка
                  </div>
                  <div className="text-base font-semibold">{props.result.score.toFixed(2)}</div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[320px] whitespace-normal">
                <div className="space-y-2">
                  <div className="font-medium">Почему карточка оказалась выше</div>
                  <div className="text-[11px] text-background/80">
                    Итоговый score складывается из совпадения в индексе, характеристик, истории
                    заказчика и действий в текущей сессии.
                  </div>
                  {(props.result.scoreBreakdown ?? []).slice(0, 8).map((factor) => (
                    <div
                      key={`${props.result.product.id}-${factor.type}-${factor.reason}`}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 text-[11px] text-background/90">{factor.reason}</div>
                      <div className="shrink-0 text-[11px] font-medium">
                        {formatSignedScore(factor.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>

            <div className="flex flex-wrap justify-end gap-1">
              <ActionIconButton
                label={ACTION_DETAILS.open.label}
                description={ACTION_DETAILS.open.description}
                impact={ACTION_DETAILS.open.impact}
                icon={<Eye className="size-4" />}
                onClick={props.onOpen}
              />
              <ActionIconButton
                label={ACTION_DETAILS.relevant.label}
                description={ACTION_DETAILS.relevant.description}
                impact={ACTION_DETAILS.relevant.impact}
                icon={<ThumbsUp className="size-4" />}
                variant="secondary"
                onClick={props.onRelevant}
              />
              <ActionIconButton
                label={ACTION_DETAILS.save.label}
                description={ACTION_DETAILS.save.description}
                impact={ACTION_DETAILS.save.impact}
                icon={<Bookmark className="size-4" />}
                onClick={props.onSave}
              />
              <ActionIconButton
                label={ACTION_DETAILS.details.label}
                description={ACTION_DETAILS.details.description}
                impact={ACTION_DETAILS.details.impact}
                icon={<Info className="size-4" />}
                variant="ghost"
                onClick={props.onDetails}
              />
              <ActionIconButton
                label={ACTION_DETAILS.bounce.label}
                description={ACTION_DETAILS.bounce.description}
                impact={ACTION_DETAILS.bounce.impact}
                icon={<CornerUpLeft className="size-4" />}
                variant="ghost"
                onClick={props.onBounce}
              />
              <ActionIconButton
                label={ACTION_DETAILS.irrelevant.label}
                description={ACTION_DETAILS.irrelevant.description}
                impact={ACTION_DETAILS.irrelevant.impact}
                icon={<ThumbsDown className="size-4" />}
                variant="destructive"
                onClick={props.onIrrelevant}
              />
            </div>
          </CardAction>
        </div>
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
              Ключевые факторы ранжирования
            </div>
            <div className="space-y-2 text-sm">
              {topFactors.map((factor) => (
                <div
                  key={`${props.result.product.id}-${factor.type}-${factor.reason}`}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 text-balance text-foreground/90">{factor.reason}</div>
                  <div className="shrink-0 font-medium text-foreground/70">
                    {formatSignedScore(factor.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
          <span>Оценочные действия вынесены в правый верхний угол карточки.</span>
          <span>Кнопка «Детали» только открывает карточку и не меняет ранжирование.</span>
        </div>
      </CardContent>
      <CardFooter className="hidden">
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
  const [pageSize, setPageSize] = useState(() =>
    readStoredNumber(STORAGE_KEYS.pageSize, PAGE_SIZE_OPTIONS[0]),
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
    window.localStorage.setItem(STORAGE_KEYS.customerId, selectedCustomer)
  }, [selectedCustomer])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.sessionId, sessionId)
  }, [sessionId])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.pageSize, String(pageSize))
  }, [pageSize])

  useEffect(() => {
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
    if (activeTab !== 'search' || !hasDataset || searching) {
      return
    }
    if (query.trim().length > 0) {
      return
    }
    if (!selectedCustomer && profiles.length > 0) {
      return
    }
    void loadRecommendations({ capturePrevious: false, targetTab: 'search' })
  }, [activeTab, hasDataset, selectedCustomer, query])

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
    setPageSize(PAGE_SIZE_OPTIONS[0])
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

  async function loadRecommendations(options?: {
    capturePrevious?: boolean
    nextCustomerId?: string
    nextSessionId?: string
    nextPage?: number
    nextPageSize?: number
    targetTab?: TabId
  }) {
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
      if (countActiveFilters(filters) > 0) {
        setFilters({})
      }
      setSearchState(payload)
      setPage(resolvedPage)
      setPageSize(requestedPageSize)
      setActiveTab(options?.targetTab ?? 'search')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕСЃС‚СЂРѕРёС‚СЊ Р±Р°Р·РѕРІСѓСЋ РїРµСЂСЃРѕРЅР°Р»РёР·РёСЂРѕРІР°РЅРЅСѓСЋ РїРѕРґР±РѕСЂРєСѓ.',
      )
    } finally {
      setSearching(false)
    }
  }

  async function executeSearch(options?: {
    capturePrevious?: boolean
    nextCustomerId?: string
    nextSessionId?: string
    nextFilters?: SearchFilters
    nextPage?: number
    nextPageSize?: number
    targetTab?: TabId
  }) {
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
    const isFeedFlow = normalizedQuery.length === 0

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
      if (isFeedFlow) {
        await loadRecommendations({ capturePrevious: true })
      } else {
        await executeSearch({ capturePrevious: true })
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
    setFilters({})
    setActiveResult(null)
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
        capturePrevious: Boolean(searchState),
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

  const categoryFacets = searchState?.facets?.categories ?? []
  const brandFacets = searchState?.facets?.brands ?? []
  const attributeFacets = searchState?.facets?.attributes ?? []
  const profileSummary = searchState?.profileSummary
  const selectedProfile = profiles.find((profile) => profile.customerId === selectedCustomer) ?? null
  const isFeedMode = Boolean(
    searchState && searchState.parserSource.endsWith('_feed') && query.trim().length === 0,
  )
  const currentPage = searchState
    ? Math.max(1, Math.floor(searchState.offset / Math.max(searchState.limit, 1)) + 1)
    : page
  const totalPages = searchState
    ? Math.max(1, Math.ceil(searchState.totalCount / Math.max(searchState.limit, 1)))
    : 1

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
                            void executeSearch({ targetTab: 'search', nextPage: 1 })
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
                      disabled={!hasDataset || searching}
                      onClick={() => void executeSearch({ targetTab: 'search', nextPage: 1 })}
                    >
                      {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                      {query.trim().length > 0 ? 'Искать' : 'Подобрать'}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11"
                      onClick={() => {
                        const nextSessionId = createSessionId()
                        setSessionId(nextSessionId)
                        setPage(1)
                        if (query.trim()) {
                          void executeSearch({
                            nextSessionId,
                            capturePrevious: true,
                            nextPage: 1,
                          })
                        } else {
                          void loadRecommendations({
                            nextSessionId,
                            capturePrevious: Boolean(searchState),
                            nextPage: 1,
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

                {interpretation && !isFeedMode ? (
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

                {isFeedMode ? (
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Персональная витрина
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      При пустом запросе система сразу показывает базовую подборку под выбранного
                      заказчика: сначала учитывает историю контрактов и категории профиля, затем
                      дотягивает витрину популярными позициями и сразу реагирует на действия в
                      текущей сессии.
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
                  {!isFeedMode ? (
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
                  ) : null}

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
                          ? `${formatNumber(searchState.totalCount)} результатов, страница ${formatNumber(currentPage)} из ${formatNumber(totalPages)}`
                          : 'Сначала выполни поиск.'}
                      </div>
                    </div>
                    {searchState ? (
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Нормализация {searchState.timingsMs.normalize} ms</Badge>
                        <Badge variant="outline">Поиск {searchState.timingsMs.retrieve} ms</Badge>
                        <Badge variant="outline">Переранжирование {searchState.timingsMs.rerank} ms</Badge>
                        <Badge>Всего {searchState.timingsMs.total} ms</Badge>
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
                      onPageChange={(nextPage) => {
                        if (isFeedMode) {
                          void loadRecommendations({
                            capturePrevious: false,
                            nextPage,
                            targetTab: 'search',
                          })
                        } else {
                          void executeSearch({ capturePrevious: false, nextPage, targetTab: 'search' })
                        }
                      }}
                      onPageSizeChange={(nextPageSize) => {
                        if (isFeedMode) {
                          void loadRecommendations({
                            capturePrevious: false,
                            nextPage: 1,
                            nextPageSize,
                            targetTab: 'search',
                          })
                        } else {
                          void executeSearch({
                            capturePrevious: false,
                            nextPage: 1,
                            nextPageSize,
                            targetTab: 'search',
                          })
                        }
                      }}
                    />
                  ) : null}

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
                          position={searchState.offset + index + 1}
                          onOpen={() =>
                            void handleResultEvent(
                              'result_opened',
                              result,
                              searchState.offset + index + 1,
                              true,
                            )
                          }
                          onRelevant={() =>
                            void handleResultEvent(
                              'marked_relevant',
                              result,
                              searchState.offset + index + 1,
                            )
                          }
                          onIrrelevant={() =>
                            void handleResultEvent(
                              'marked_irrelevant',
                              result,
                              searchState.offset + index + 1,
                            )
                          }
                          onBounce={() =>
                            void handleResultEvent(
                              'result_bounced',
                              result,
                              searchState.offset + index + 1,
                            )
                          }
                          onSave={() =>
                            void handleResultEvent(
                              'result_saved',
                              result,
                              searchState.offset + index + 1,
                            )
                          }
                          onDetails={() => setActiveResult(result)}
                        />
                      ))}
                    </div>
                  ) : null}

                  {searchState && searchState.results.length > 0 ? (
                    <SearchPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      pageSize={searchState.limit}
                      totalCount={searchState.totalCount}
                      disabled={searching}
                      onPageChange={(nextPage) => {
                        if (isFeedMode) {
                          void loadRecommendations({
                            capturePrevious: false,
                            nextPage,
                            targetTab: 'search',
                          })
                        } else {
                          void executeSearch({ capturePrevious: false, nextPage, targetTab: 'search' })
                        }
                      }}
                      onPageSizeChange={(nextPageSize) => {
                        if (isFeedMode) {
                          void loadRecommendations({
                            capturePrevious: false,
                            nextPage: 1,
                            nextPageSize,
                            targetTab: 'search',
                          })
                        } else {
                          void executeSearch({
                            capturePrevious: false,
                            nextPage: 1,
                            nextPageSize,
                            targetTab: 'search',
                          })
                        }
                      }}
                    />
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
        <DialogContent className="w-[min(1280px,calc(100vw-2rem))] max-w-none p-0">
          {activeResult ? (
            <div className="max-h-[calc(100vh-2rem)] overflow-y-auto p-6">
              <DialogHeader>
                <DialogTitle>{activeResult.product.title}</DialogTitle>
                <DialogDescription>
                  {activeResult.product.category}
                  {activeResult.product.brandGuess ? ` · ${activeResult.product.brandGuess}` : ''}
                  {activeResult.product.modelGuess ? ` · ${activeResult.product.modelGuess}` : ''}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
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
                          <div className="shrink-0 font-medium">{formatSignedScore(factor.value)}</div>
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
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
