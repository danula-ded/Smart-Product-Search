import {
  Bookmark,
  CornerUpLeft,
  Eye,
  Info,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'

import { searchActionDetails } from '@/shared/constants/search'
import { AppCard, AppCardContent, AppCardDescription, AppCardHeader, AppCardTitle } from '@/shared/ui'

const actionIcons = {
  open: Eye,
  relevant: ThumbsUp,
  save: Bookmark,
  details: Info,
  bounce: CornerUpLeft,
  irrelevant: ThumbsDown,
} as const

export function FeedbackLegend() {
  return (
    <AppCard>
      <AppCardHeader className="pb-1">
        <AppCardTitle className="text-base">Как влияют действия на карточке</AppCardTitle>
        <AppCardDescription>
          Подсказки повторяются на иконках. Положительные сигналы поднимают похожие результаты,
          отрицательные сразу перестраивают выдачу вниз.
        </AppCardDescription>
      </AppCardHeader>
      <AppCardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(Object.keys(searchActionDetails) as Array<keyof typeof searchActionDetails>).map((key) => {
          const details = searchActionDetails[key]
          const Icon = actionIcons[key]

          return (
            <div
              key={key}
              className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-section)] p-4"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--semantic-text-primary)]">
                <Icon className="size-4 text-[var(--semantic-icon-primary)]" />
                <span>{details.label}</span>
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--semantic-text-secondary)]">
                {details.description}
              </div>
              <div className="mt-2 text-xs leading-5 text-[var(--semantic-text-muted)]">
                {details.impact}
              </div>
            </div>
          )
        })}
      </AppCardContent>
    </AppCard>
  )
}
