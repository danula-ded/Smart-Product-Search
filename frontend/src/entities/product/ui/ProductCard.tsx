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
        <AppButton size="icon-sm" variant={variant} aria-label={label} onClick={onClick}>
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

          <AppCardAction className="flex max-w-[220px] flex-wrap items-start justify-end gap-1.5">
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

        <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-section)] p-4 text-sm leading-6 text-[var(--semantic-text-secondary)]">
          Подробные характеристики и расширенное описание доступны в карточке товара.
        </div>
      </AppCardContent>
    </AppCard>
  )
}
