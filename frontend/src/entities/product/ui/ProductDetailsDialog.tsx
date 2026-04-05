import type { SearchResult } from '@/entities/product/model/types'
import { AppBadge, AppButton } from '@/shared/ui'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui'

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
                    Описание
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
                    Общие сведения
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <AppBadge tone="outline">{result.product.category}</AppBadge>
                    {result.product.brandGuess ? (
                      <AppBadge tone="subtle">{result.product.brandGuess}</AppBadge>
                    ) : null}
                    {result.product.modelGuess ? (
                      <AppBadge tone="subtle">{result.product.modelGuess}</AppBadge>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-section)] p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--semantic-text-muted)]">
                    Действия
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {onRelevant ? (
                      <AppButton onClick={onRelevant}>Релевантно</AppButton>
                    ) : null}
                    {onIrrelevant ? (
                      <AppButton variant="danger" onClick={onIrrelevant}>
                        Не релевантно
                      </AppButton>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
