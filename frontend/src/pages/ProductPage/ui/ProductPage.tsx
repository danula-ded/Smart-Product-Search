import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, PackageSearch } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import { getProduct, type Product } from '@/shared/api'
import { formatNumber } from '@/shared/lib/format'
import { useWorkspace } from '@/shared/lib/workspace'
import {
  AppBadge,
  AppButton,
  AppCard,
  AppCardContent,
  AppCardHeader,
  EmptyState,
  SectionTitle,
} from '@/shared/ui'

import { ProductPageSkeleton } from './ProductPageSkeleton'

const numericValuePattern = /^-?\d+(?:[.,]\d+)?$/
const resultMetricLabels: Record<string, string> = {
  history_product: 'История по товару',
  history_category: 'История по категории',
  popular: 'Популярность',
  exploration: 'Разнообразие выдачи',
  history_tokens: 'Совпадение с профилем',
  session_product: 'Сигнал сессии по товару',
  session_category: 'Сигнал сессии по категории',
}

const parserDetailsLabels: Record<string, string> = {
  queryUnderstanding: 'Разбор запроса',
  retrieval: 'Поиск',
  ranking: 'Ранжирование',
  feedMode: 'Режим витрины',
}

function formatAttributeValue(value: string, numericValue?: number | null) {
  if (numericValue == null || !numericValuePattern.test(value.trim())) {
    return value
  }

  if (Number.isInteger(numericValue)) {
    return formatNumber(numericValue)
  }

  return numericValue.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  })
}

function getUniqueAttributes(product: Product) {
  const uniqueAttributes = new Map<string, { key: string; name: string; value: string }>()

  for (const attribute of product.attributes) {
    const formattedValue = formatAttributeValue(attribute.value, attribute.numericValue)
    const key = `${attribute.name}::${formattedValue}`
    if (!uniqueAttributes.has(key)) {
      uniqueAttributes.set(key, {
        key,
        name: attribute.name,
        value: formattedValue,
      })
    }
  }

  return Array.from(uniqueAttributes.values())
}

function buildProductDescription(product: Product) {
  const uniqueAttributes = getUniqueAttributes(product)
  if (uniqueAttributes.length > 0) {
    return uniqueAttributes.map((attribute) => `${attribute.name}: ${attribute.value}`)
  }

  return Array.from(
    new Set(
      product.attributesRaw
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

function formatParserDetailValue(value: unknown) {
  if (typeof value === 'boolean') {
    return value ? 'Да' : 'Нет'
  }

  if (typeof value === 'number') {
    return formatNumber(value)
  }

  return String(value)
}

export function ProductPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const workspace = useWorkspace()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trackedOpenIdRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadProduct() {
      setLoading(true)
      setError(null)
      setNotFound(false)
      setProduct(null)

      try {
        const payload = await getProduct(id)
        if (!cancelled) {
          setProduct(payload)
        }
      } catch (caught) {
        if (cancelled) {
          return
        }
        const message = caught instanceof Error ? caught.message : 'Не удалось загрузить товар.'
        if (message.includes('Product not found')) {
          setNotFound(true)
        } else {
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    if (id) {
      void loadProduct()
    } else {
      setLoading(false)
      setNotFound(true)
    }

    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!id || trackedOpenIdRef.current === id || !workspace.searchState) {
      return
    }

    const matchedResult = workspace.searchState.results.find((item) => item.product.id === id)
    if (!matchedResult) {
      return
    }

    trackedOpenIdRef.current = id
    void workspace.handleResultEvent(
      'result_opened',
      matchedResult,
      workspace.getResultPosition(matchedResult),
    )
  }, [id, workspace])

  if (loading) {
    return <ProductPageSkeleton />
  }

  if (notFound) {
    return (
      <EmptyState
        icon={<PackageSearch className="size-6" />}
        title="Товар не найден"
        description="Проверьте ссылку или вернитесь в каталог и откройте другую карточку."
        action={
          <AppButton variant="outline" onClick={() => navigate('/catalog')}>
            <ArrowLeft className="size-4" />
            Вернуться в каталог
          </AppButton>
        }
      />
    )
  }

  if (error || !product) {
    return (
      <EmptyState
        icon={<PackageSearch className="size-6" />}
        title="Не удалось загрузить товар"
        description={error ?? 'Попробуйте открыть страницу еще раз.'}
        action={
          <AppButton variant="outline" onClick={() => navigate('/catalog')}>
            <ArrowLeft className="size-4" />
            Вернуться в каталог
          </AppButton>
        }
      />
    )
  }

  const uniqueAttributes = getUniqueAttributes(product)
  const productDescription = buildProductDescription(product)
  const matchedResult =
    workspace.searchState?.results.find((item) => item.product.id === product.id) ?? null
  const parserDetails = Object.entries(workspace.searchState?.parserSourceDetails ?? {}).filter(
    ([, value]) => value != null && value !== '',
  )
  const searchContextSummary = [
    workspace.searchState?.parserSource
      ? `Источник: ${workspace.searchState.parserSource}`
      : null,
    workspace.searchState?.rankingModelVersion
      ? `Модель ранжирования: ${workspace.searchState.rankingModelVersion}`
      : 'Модель ранжирования: heuristic',
    workspace.searchState?.query ? `Запрос: ${workspace.searchState.query}` : null,
  ].filter(Boolean)

  return (
    <div className="min-w-0 space-y-6">
      <AppButton variant="outline" onClick={() => navigate(-1)}>
        <ArrowLeft className="size-4" />
        Назад
      </AppButton>

      <SectionTitle
        title={<span className="break-words [overflow-wrap:anywhere]">{product.title}</span>}
        description={product.category}
        badge={
          <div className="flex flex-wrap gap-2">
            <AppBadge tone="outline">{product.category}</AppBadge>
            {product.brandGuess ? <AppBadge tone="subtle">{product.brandGuess}</AppBadge> : null}
            {product.modelGuess ? <AppBadge tone="subtle">{product.modelGuess}</AppBadge> : null}
          </div>
        }
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0 space-y-4">
          {matchedResult ? (
            <AppCard tone="highlight">
              <AppCardHeader>
                <SectionTitle
                  title="Контекст рекомендации"
                  description="Почему этот товар попал в текущую выдачу и какие сигналы повлияли на позицию."
                />
              </AppCardHeader>
              <AppCardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <AppBadge tone="outline">Скор: {matchedResult.score.toFixed(3)}</AppBadge>
                  {(matchedResult.scoreBreakdown ?? []).length > 0 ? (
                    <AppBadge tone="info">
                      Сигналов: {formatNumber(matchedResult.scoreBreakdown!.length)}
                    </AppBadge>
                  ) : null}
                </div>

                <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-section)] p-4 text-sm leading-6 text-[var(--semantic-text-secondary)]">
                  {matchedResult.explanation}
                </div>

                {matchedResult.scoreBreakdown && matchedResult.scoreBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {matchedResult.scoreBreakdown.map((item, index) => (
                      <div
                        key={`${item.type}-${index}`}
                        className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium text-[var(--semantic-text-primary)]">
                            {resultMetricLabels[item.type] ?? item.type}
                          </div>
                          <AppBadge tone="subtle">{item.value.toFixed(4)}</AppBadge>
                        </div>
                        <div className="mt-2 text-sm leading-6 text-[var(--semantic-text-secondary)]">
                          {item.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </AppCardContent>
            </AppCard>
          ) : null}

          <AppCard>
            <AppCardHeader>
              <SectionTitle
                title="Описание"
                description="Основная информация по выбранной позиции каталога."
              />
            </AppCardHeader>
            <AppCardContent className="space-y-2 break-words text-sm leading-6 text-[var(--semantic-text-secondary)] [overflow-wrap:anywhere]">
              {productDescription.length > 0 ? (
                productDescription.map((line) => <div key={line}>{line}</div>)
              ) : (
                'Подробное текстовое описание для этой позиции отсутствует.'
              )}
            </AppCardContent>
          </AppCard>

          <AppCard>
            <AppCardHeader>
              <SectionTitle
                title="Характеристики"
                description="Дополнительные атрибуты и параметры товара."
              />
            </AppCardHeader>
            <AppCardContent className="flex min-w-0 flex-wrap gap-2">
              {uniqueAttributes.length > 0 ? (
                uniqueAttributes.map((attribute) => (
                  <AppBadge
                    key={`${product.id}-${attribute.key}`}
                    tone="subtle"
                    className="h-auto min-w-0 max-w-full whitespace-normal break-words py-1.5 [overflow-wrap:anywhere]"
                  >
                    {attribute.name}: {attribute.value}
                  </AppBadge>
                ))
              ) : (
                <div className="text-sm text-[var(--semantic-text-secondary)]">
                  Дополнительные характеристики отсутствуют.
                </div>
              )}
            </AppCardContent>
          </AppCard>
        </div>

        <div className="min-w-0 space-y-4">
          {workspace.searchState ? (
            <AppCard tone="info">
              <AppCardHeader>
                <SectionTitle
                  title="Данные из recommendations"
                  description="Метаданные ответа, с которым товар был показан в ленте или поисковой выдаче."
                />
              </AppCardHeader>
              <AppCardContent className="space-y-4 text-sm text-[var(--semantic-text-secondary)]">
                <div className="flex flex-wrap gap-2">
                  {searchContextSummary.map((item) => (
                    <AppBadge key={item} tone="outline">
                      {item}
                    </AppBadge>
                  ))}
                </div>

                {parserDetails.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {parserDetails.map(([key, value]) => (
                      <AppBadge key={key} tone="subtle">
                        {parserDetailsLabels[key] ?? key}: {formatParserDetailValue(value)}
                      </AppBadge>
                    ))}
                  </div>
                ) : null}

                {workspace.searchState.profileSummary ? (
                  <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--semantic-text-muted)]">
                      Профиль заказчика
                    </div>
                    <div className="mt-2 font-medium text-[var(--semantic-text-primary)]">
                      {workspace.searchState.profileSummary.customerName}
                    </div>
                    <div className="mt-1 text-sm text-[var(--semantic-text-secondary)]">
                      {workspace.searchState.profileSummary.customerId}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <AppBadge tone="outline">
                        Закупок: {formatNumber(workspace.searchState.profileSummary.purchaseCount)}
                      </AppBadge>
                      <AppBadge tone="outline">
                        Совпадений: {formatNumber(workspace.searchState.profileSummary.matchedPurchaseCount)}
                      </AppBadge>
                      <AppBadge tone="outline">
                        Категорий в топе: {formatNumber(workspace.searchState.profileSummary.topCategories.length)}
                      </AppBadge>
                    </div>
                  </div>
                ) : null}
              </AppCardContent>
            </AppCard>
          ) : null}

          <AppCard tone="info">
            <AppCardHeader>
              <SectionTitle
                title="Карточка товара"
                description="Ключевые сведения по позиции каталога."
              />
            </AppCardHeader>
            <AppCardContent className="space-y-4 text-sm text-[var(--semantic-text-secondary)]">
              <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--semantic-text-muted)]">
                  Идентификатор
                </div>
                <div className="mt-2 break-words text-sm font-medium text-[var(--semantic-text-primary)] [overflow-wrap:anywhere]">
                  {product.id}
                </div>
              </div>

              <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--semantic-text-muted)]">
                  Категория
                </div>
                <div className="mt-2 break-words text-sm font-medium text-[var(--semantic-text-primary)] [overflow-wrap:anywhere]">
                  {product.category}
                </div>
              </div>

              {product.brandGuess || product.modelGuess ? (
                <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--semantic-text-muted)]">
                    Дополнительно
                  </div>
                  <div className="mt-2 space-y-2">
                    {product.brandGuess ? (
                      <div className="break-words text-sm text-[var(--semantic-text-primary)] [overflow-wrap:anywhere]">
                        Бренд: {product.brandGuess}
                      </div>
                    ) : null}
                    {product.modelGuess ? (
                      <div className="break-words text-sm text-[var(--semantic-text-primary)] [overflow-wrap:anywhere]">
                        Модель: {product.modelGuess}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </AppCardContent>
          </AppCard>
        </div>
      </div>
    </div>
  )
}
