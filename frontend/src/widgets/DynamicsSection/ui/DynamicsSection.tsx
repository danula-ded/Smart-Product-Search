import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

import { AppCard, AppCardContent, AppCardDescription, AppCardHeader, AppCardTitle } from '@/shared/ui'

type ComparisonRow = {
  id: string
  title: string
  before: number | null
  after: number
  delta: number | null
}

type DynamicsSectionProps = {
  comparisonRows: ComparisonRow[]
}

export function DynamicsSection({ comparisonRows }: DynamicsSectionProps) {
  return (
    <AppCard>
      <AppCardHeader>
        <AppCardTitle>Как меняется выдача</AppCardTitle>
        <AppCardDescription>
          Здесь видно, как ранжирование перестраивается после действий пользователя в той же
          сессии.
        </AppCardDescription>
      </AppCardHeader>
      <AppCardContent>
        {comparisonRows.length === 0 ? (
          <div className="text-sm leading-6 text-[var(--semantic-text-secondary)]">
            Сначала выполни поиск, затем отметь карточку как релевантную, нерелевантную или сделай
            быстрый возврат.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {comparisonRows.map((row) => (
              <div
                key={row.id}
                className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-section)] p-4"
              >
                <div className="text-sm font-semibold text-balance text-[var(--semantic-text-primary)]">
                  {row.title}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-md border border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] px-2 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-[var(--semantic-text-muted)]">
                      Было
                    </div>
                    <div className="mt-1 font-semibold text-[var(--semantic-text-primary)]">
                      {row.before ?? 'new'}
                    </div>
                  </div>
                  <div className="rounded-md border border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] px-2 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-[var(--semantic-text-muted)]">
                      Стало
                    </div>
                    <div className="mt-1 font-semibold text-[var(--semantic-text-primary)]">
                      {row.after}
                    </div>
                  </div>
                  <div className="rounded-md border border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] px-2 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-[var(--semantic-text-muted)]">
                      Δ
                    </div>
                    <div className="mt-1 flex items-center justify-center gap-1 font-semibold text-[var(--semantic-text-primary)]">
                      {row.delta == null ? (
                        'new'
                      ) : row.delta > 0 ? (
                        <>
                          <ArrowUpRight className="size-4 text-[var(--semantic-status-success)]" />
                          {row.delta}
                        </>
                      ) : row.delta < 0 ? (
                        <>
                          <ArrowDownRight className="size-4 text-[var(--semantic-status-danger)]" />
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
      </AppCardContent>
    </AppCard>
  )
}
