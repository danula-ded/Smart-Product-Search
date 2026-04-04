import type { DatasetJob } from '@/shared/api'
import { AppBadge } from '@/shared/ui'

type DatasetStatusCardProps = {
  displayedJob: DatasetJob | null
}

function StatTile(props: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] px-4 py-3">
      <div className="text-xs text-[var(--semantic-text-muted)]">{props.label}</div>
      <div className="mt-1 font-semibold text-[var(--semantic-text-primary)]">{props.value}</div>
    </div>
  )
}

export function DatasetStatusCard({ displayedJob }: DatasetStatusCardProps) {
  return (
    <div className="rounded-xl border border-[var(--semantic-border-default)] bg-[var(--semantic-background-card)] p-6">
      <div className="space-y-2">
        <div className="text-lg font-semibold text-[var(--semantic-text-primary)]">Статус импорта</div>
        <div className="text-sm leading-6 text-[var(--semantic-text-secondary)]">
          Последняя активная или успешная задача обработки датасета.
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {displayedJob ? (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatTile label="Job ID" value={displayedJob.jobId} />
              <StatTile label="Статус" value={displayedJob.status} />
              <StatTile label="Режим" value={displayedJob.mode} />
              <StatTile label="Прогресс" value={`${Math.round(displayedJob.progress)}%`} />
            </div>
            <div className="h-2 rounded-full bg-[var(--semantic-progress-track)]">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${Math.max(4, Math.min(100, displayedJob.progress))}%` }}
              />
            </div>
            {displayedJob.warnings.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-highlight)] p-4">
                <div className="text-sm font-semibold text-[var(--semantic-text-primary)]">Warnings</div>
                <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--semantic-text-secondary)]">
                  {displayedJob.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {displayedJob.errors.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-[var(--semantic-border-interactive)] bg-[var(--semantic-background-danger)] p-4">
                <div className="text-sm font-semibold text-[var(--semantic-status-danger)]">Errors</div>
                <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--semantic-status-danger)]">
                  {displayedJob.errors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <div className="text-sm text-[var(--semantic-text-secondary)]">
            Задач обработки пока не было.
          </div>
        )}

        {displayedJob ? (
          <div className="flex flex-wrap gap-2">
            <AppBadge tone="outline">{displayedJob.createdAt}</AppBadge>
            <AppBadge tone="subtle">{displayedJob.status}</AppBadge>
          </div>
        ) : null}
      </div>
    </div>
  )
}
