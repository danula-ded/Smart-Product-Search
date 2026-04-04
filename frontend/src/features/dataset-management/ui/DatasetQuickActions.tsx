import { Database, Trash2 } from 'lucide-react'

import { AppButton } from '@/shared/ui'

type DatasetQuickActionsProps = {
  datasetBusy: boolean
  onBootstrap: () => void
  onClear: () => void
}

export function DatasetQuickActions({
  datasetBusy,
  onBootstrap,
  onClear,
}: DatasetQuickActionsProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
      <div className="space-y-4 rounded-xl border border-[var(--semantic-border-default)] bg-[var(--semantic-background-card)] p-6">
        <div className="space-y-2">
          <div className="text-lg font-semibold text-[var(--semantic-text-primary)]">Быстрый старт</div>
          <div className="text-sm leading-6 text-[var(--semantic-text-secondary)]">
            Загрузка встроенного датасета из папки проекта без ручного выбора CSV.
          </div>
        </div>
        <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-section)] p-4 text-sm leading-6 text-[var(--semantic-text-secondary)]">
          Используй этот режим перед защитой, чтобы быстро поднять систему на полном наборе данных.
        </div>
        <AppButton stretch disabled={datasetBusy} onClick={onBootstrap}>
          <Database className="size-4" />
          Загрузить встроенный датасет
        </AppButton>
      </div>

      <div className="space-y-4 rounded-xl border border-[var(--semantic-border-default)] bg-[var(--semantic-background-card)] p-6">
        <div className="space-y-2">
          <div className="text-lg font-semibold text-[var(--semantic-text-primary)]">Очистка базы</div>
          <div className="text-sm leading-6 text-[var(--semantic-text-secondary)]">
            Полностью очищает SQLite-базу и индекс, чтобы начать с чистого состояния.
          </div>
        </div>
        <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-danger)] p-4 text-sm leading-6 text-[var(--semantic-text-secondary)]">
          Полезно, если нужно быстро перепроверить сценарий первой загрузки или заменить датасет перед новой демонстрацией.
        </div>
        <AppButton variant="danger" stretch disabled={datasetBusy} onClick={onClear}>
          <Trash2 className="size-4" />
          Очистить текущую базу
        </AppButton>
      </div>
    </div>
  )
}
