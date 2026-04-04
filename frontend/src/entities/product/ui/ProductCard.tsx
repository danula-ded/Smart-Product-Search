import type { ReactNode } from 'react'
import {
  Bookmark,
  CornerUpLeft,
  Eye,
  Info,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'

import type { SearchResult } from '@/entities/product/model/types'
import { CategoryTag } from '@/entities/category'
import { formatSignedScore } from '@/shared/lib/format'
import { searchActionDetails } from '@/shared/constants/search'
import {
  AppBadge,
  AppButton,
  AppCard,
  AppCardAction,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui'

import { ProductBadge } from './ProductBadge'

type ProductCardProps = {
  result: SearchResult
  position: number
  onOpen: () => void
  onRelevant: () => void
  onIrrelevant: () => void
  onBounce: () => void
  onSave: () => void
  onDetails: () => void
}

type ActionIconButtonProps = {
  label: string
  description: string
  impact: string
  icon: ReactNode
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger'
  onClick: () => void
}

function ActionIconButton({
  label,
  description,
  impact,
  icon,
  variant = 'outline',
  onClick,
}: ActionIconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <AppButton
          size="icon-sm"
          variant={variant}
          aria-label={label}
          onClick={onClick}
        >
          {icon}
        </AppButton>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[260px] whitespace-normal">
        <div className="space-y-1">
          <div className="font-medium">{label}</div>
          <div className="text-[11px] text-white/80">{description}</div>
          <div className="text-[11px] text-white/80">{impact}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export function ProductCard({
  result,
  position,
  onOpen,
  onRelevant,
  onIrrelevant,
  onBounce,
  onSave,
  onDetails,
}: ProductCardProps) {
  const topFactors = result.scoreBreakdown?.slice(0, 3) ?? []

  return (
    <AppCard className="h-full">
      <AppCardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <AppBadge tone="outline">#{position}</AppBadge>
              <CategoryTag>{result.product.category}</CategoryTag>
              {result.product.brandGuess ? (
                <AppBadge tone="subtle">{result.product.brandGuess}</AppBadge>
              ) : null}
            </div>
            <div className="space-y-2">
              <AppCardTitle className="text-balance text-lg leading-7">
                {result.product.title}
              </AppCardTitle>
              <AppCardDescription className="max-w-[72ch] leading-6">
                {result.explanation}
              </AppCardDescription>
            </div>
          </div>

          <AppCardAction className="flex max-w-[220px] flex-wrap items-start justify-end gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="rounded-md border border-[var(--semantic-border-default)] bg-[var(--semantic-background-section)] px-3 py-2 text-right transition-colors hover:bg-[var(--semantic-control-hover)]"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--semantic-text-muted)]">
                    Score
                  </div>
                  <div className="text-base font-semibold text-[var(--semantic-text-primary)]">
                    {result.score.toFixed(2)}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[320px] whitespace-normal">
                <div className="space-y-2">
                  <div className="font-medium">Почему карточка оказалась выше</div>
                  <div className="text-[11px] text-white/80">
                    Итоговый score складывается из совпадения в индексе, характеристик, истории
                    заказчика и действий в текущей сессии.
                  </div>
                  {(result.scoreBreakdown ?? []).slice(0, 8).map((factor) => (
                    <div
                      key={`${result.product.id}-${factor.type}-${factor.reason}`}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 text-[11px] text-white/90">{factor.reason}</div>
                      <div className="shrink-0 text-[11px] font-medium">
                        {formatSignedScore(factor.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>

            <div className="flex flex-wrap justify-end gap-1.5">
              <ActionIconButton
                label={searchActionDetails.open.label}
                description={searchActionDetails.open.description}
                impact={searchActionDetails.open.impact}
                icon={<Eye className="size-4" />}
                onClick={onOpen}
              />
              <ActionIconButton
                label={searchActionDetails.relevant.label}
                description={searchActionDetails.relevant.description}
                impact={searchActionDetails.relevant.impact}
                icon={<ThumbsUp className="size-4" />}
                variant="secondary"
                onClick={onRelevant}
              />
              <ActionIconButton
                label={searchActionDetails.save.label}
                description={searchActionDetails.save.description}
                impact={searchActionDetails.save.impact}
                icon={<Bookmark className="size-4" />}
                variant="accent"
                onClick={onSave}
              />
              <ActionIconButton
                label={searchActionDetails.details.label}
                description={searchActionDetails.details.description}
                impact={searchActionDetails.details.impact}
                icon={<Info className="size-4" />}
                variant="ghost"
                onClick={onDetails}
              />
              <ActionIconButton
                label={searchActionDetails.bounce.label}
                description={searchActionDetails.bounce.description}
                impact={searchActionDetails.bounce.impact}
                icon={<CornerUpLeft className="size-4" />}
                variant="ghost"
                onClick={onBounce}
              />
              <ActionIconButton
                label={searchActionDetails.irrelevant.label}
                description={searchActionDetails.irrelevant.description}
                impact={searchActionDetails.irrelevant.impact}
                icon={<ThumbsDown className="size-4" />}
                variant="danger"
                onClick={onIrrelevant}
              />
            </div>
          </AppCardAction>
        </div>
      </AppCardHeader>

      <AppCardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {result.product.attributes.slice(0, 5).map((attribute) => (
            <ProductBadge
              key={`${result.product.id}-${attribute.name}-${attribute.value}`}
              attribute={attribute}
            />
          ))}
        </div>

        {topFactors.length > 0 ? (
          <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-section)] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--semantic-text-muted)]">
              Ключевые факторы ранжирования
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {topFactors.map((factor) => (
                <div
                  key={`${result.product.id}-${factor.type}-${factor.reason}`}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 text-balance text-[var(--semantic-text-primary)]/90">
                    {factor.reason}
                  </div>
                  <div className="shrink-0 font-medium text-[var(--semantic-text-secondary)]">
                    {formatSignedScore(factor.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-between gap-3 border-t border-[var(--semantic-border-muted)] pt-4 text-xs text-[var(--semantic-text-muted)]">
          <span>Оценочные действия вынесены в правый верхний угол карточки.</span>
          <span>Кнопка «Детали» только открывает карточку и не меняет ранжирование.</span>
        </div>
      </AppCardContent>
    </AppCard>
  )
}
