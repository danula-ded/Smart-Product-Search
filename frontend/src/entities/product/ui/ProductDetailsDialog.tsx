import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui'
import { AppButton, AppBadge } from '@/shared/ui'
import { formatSignedScore } from '@/shared/lib/format'
import type { SearchResult } from '@/entities/product/model/types'

import { ProductBadge } from './ProductBadge'

type ProductDetailsDialogProps = {
  result: SearchResult | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRelevant?: () => void
  onIrrelevant?: () => void
}

export function ProductDetailsDialog({
  result,
  open,
  onOpenChange,
  onRelevant,
  onIrrelevant,
}: ProductDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(1280px,calc(100vw-2rem))] max-w-none p-0">
        {result ? (
          <div className="max-h-[calc(100vh-2rem)] overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl">{result.product.title}</DialogTitle>
              <DialogDescription>
                {result.product.category}
                {result.product.brandGuess ? ` • ${result.product.brandGuess}` : ''}
                {result.product.modelGuess ? ` • ${result.product.modelGuess}` : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-section)] p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--semantic-text-muted)]">
                    Почему карточка поднялась
                  </div>
                  <div className="mt-3 text-sm leading-6 text-[var(--semantic-text-primary)]">
                    {result.explanation}
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-section)] p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--semantic-text-muted)]">
                    Характеристики
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.product.attributes.map((attribute) => (
                      <ProductBadge
                        key={`${result.product.id}-${attribute.name}-${attribute.value}`}
                        attribute={attribute}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-info)] p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--semantic-text-muted)]">
                    Score
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-[var(--semantic-text-primary)]">
                    {result.score.toFixed(2)}
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-section)] p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--semantic-text-muted)]">
                    Детализация ранжирования
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    {(result.scoreBreakdown ?? []).map((factor) => (
                      <div
                        key={`${result.product.id}-${factor.type}-${factor.reason}`}
                        className="flex items-start justify-between gap-3 rounded-md border border-[var(--semantic-border-muted)] bg-[var(--semantic-background-elevated)] px-4 py-3"
                      >
                        <div className="min-w-0 text-balance text-[var(--semantic-text-primary)]">
                          {factor.reason}
                        </div>
                        <div className="shrink-0 font-medium text-[var(--semantic-text-secondary)]">
                          {formatSignedScore(factor.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {onRelevant ? (
                    <AppButton onClick={onRelevant}>Релевантно</AppButton>
                  ) : null}
                  {onIrrelevant ? (
                    <AppButton variant="danger" onClick={onIrrelevant}>
                      Не релевантно
                    </AppButton>
                  ) : null}
                  <AppBadge tone="outline">ID: {result.product.id}</AppBadge>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
