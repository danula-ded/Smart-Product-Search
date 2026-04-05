import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, PackageSearch } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import { getProduct, type Product } from '@/shared/api'
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
          <AppCard>
            <AppCardHeader>
              <SectionTitle
                title="Описание"
                description="Основная информация по выбранной позиции каталога."
              />
            </AppCardHeader>
            <AppCardContent className="break-words text-sm leading-6 text-[var(--semantic-text-secondary)] [overflow-wrap:anywhere]">
              {product.attributesRaw || 'Подробное текстовое описание для этой позиции отсутствует.'}
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
              {product.attributes.length > 0 ? (
                product.attributes.map((attribute) => (
                  <AppBadge
                    key={`${product.id}-${attribute.name}-${attribute.value}`}
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
