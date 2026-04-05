import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark, CornerUpLeft, Eye, Info, ThumbsDown, ThumbsUp } from 'lucide-react'

import type { SearchResult } from '@/entities/product/model/types'
import { CategoryTag } from '@/entities/category'
import { searchActionDetails } from '@/shared/constants/search'
import {
  AppBadge,
  AppButton,
  AppCard,
  AppCardAction,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui'

import { ProductBadge } from './ProductBadge'

const scoreSignalLabels: Record<string, string> = {
  history_product: 'История по товару',
  history_category: 'История по категории',
  popular: 'Популярность',
  exploration: 'Разнообразие выдачи',
  history_tokens: 'Совпадение с профилем',
  session_product: 'Сигнал сессии по товару',
  session_category: 'Сигнал сессии по категории',
}

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
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    onClick()
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <AppButton size="icon-sm" variant={variant} aria-label={label} onClick={handleClick}>
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

type ScoreBadgeProps = {
  result: SearchResult
}

function ScoreBadge({ result }: ScoreBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <AppBadge tone="info" className="cursor-help">
          {result.score.toFixed(3)}
        </AppBadge>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start" className="max-w-[360px] whitespace-normal">
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="font-medium">Score: {result.score.toFixed(3)}</div>
            <div className="text-[11px] leading-5 text-white/80">{result.explanation}</div>
          </div>

          {result.scoreBreakdown && result.scoreBreakdown.length > 0 ? (
            <div className="space-y-2">
              {result.scoreBreakdown.map((item, index) => (
                <div key={`${item.type}-${index}`} className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{scoreSignalLabels[item.type] ?? item.type}</span>
                    <span className="text-[11px] text-white/80">{item.value.toFixed(4)}</span>
                  </div>
                  <div className="text-[11px] leading-5 text-white/80">{item.reason}</div>
                </div>
              ))}
            </div>
          ) : null}
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
  const navigate = useNavigate()

  function openProductPage() {
    navigate(`/product/${result.product.id}`)
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openProductPage()
    }
  }

  return (
    <AppCard
      className="h-full cursor-pointer transition-colors duration-200 hover:border-[var(--semantic-border-strong)] hover:bg-[var(--semantic-background-elevated)]"
      role="link"
      tabIndex={0}
      onClick={openProductPage}
      onKeyDown={handleCardKeyDown}
    >
      <AppCardHeader className="space-y-4">
        <div className="flex min-w-0 flex-col gap-3">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-start gap-2">
                <AppBadge tone="outline">#{position}</AppBadge>
                <ScoreBadge result={result} />
                <CategoryTag className="min-w-0 max-w-full sm:max-w-[calc(100%-3.5rem)]">
                  {result.product.category}
                </CategoryTag>
              {result.product.brandGuess ? (
                <AppBadge
                  tone="subtle"
                  className="min-w-0 max-w-full sm:max-w-[calc(100%-3.5rem)]"
                  title={result.product.brandGuess}
                >
                  <span className="truncate">{result.product.brandGuess}</span>
                </AppBadge>
              ) : null}
              {result.product.modelGuess ? (
                <AppBadge
                  tone="subtle"
                  className="min-w-0 max-w-full sm:max-w-[calc(100%-3.5rem)]"
                  title={result.product.modelGuess}
                >
                  <span className="truncate">{result.product.modelGuess}</span>
                </AppBadge>
              ) : null}
              {result.product.attributes.slice(0, 2).map((attribute) => (
                <ProductBadge
                  key={`${result.product.id}-${attribute.name}-${attribute.value}`}
                  attribute={attribute}
                />
              ))}
            </div>

            <div className="space-y-2">
              <AppCardTitle className="text-lg leading-7 break-words">
                {result.product.title}
              </AppCardTitle>
              <AppCardDescription className="max-w-[72ch] break-words leading-6">
                {result.explanation}
              </AppCardDescription>
            </div>
          </div>

          <AppCardAction className="flex flex-wrap items-start gap-1.5 self-start">
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
    </AppCard>
  )
}
