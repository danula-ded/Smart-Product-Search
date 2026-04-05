import type { ReactNode } from 'react'
import { Database, FolderSync, ListChecks } from 'lucide-react'

import { useWorkspace } from '@/shared/lib/workspace'
import { formatNumber } from '@/shared/lib/format'
import { AppCard, AppCardContent, AppCardHeader, SectionTitle } from '@/shared/ui'
import { DataSection } from '@/widgets/DataSection'

function DataMetricCard(props: {
  title: string
  value: string
  description: string
  icon: ReactNode
}) {
  return (
    <AppCard>
      <AppCardContent className="px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--semantic-text-muted)]">
              {props.title}
            </div>
            <div className="text-2xl font-semibold text-[var(--semantic-text-primary)]">
              {props.value}
            </div>
            <div className="text-sm leading-6 text-[var(--semantic-text-secondary)]">
              {props.description}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-section)] p-2 text-[var(--semantic-icon-primary)] transition-colors duration-200 group-hover:border-[var(--semantic-border-strong)]">
            {props.icon}
          </div>
        </div>
      </AppCardContent>
    </AppCard>
  )
}

export function DataPage() {
  const model = useWorkspace()

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Управление данными"
        description="Раздел для загрузки встроенного датасета, очистки базы, дозагрузки новых файлов и контроля статуса импорта."
      />

      {model.error ? (
        <div className="rounded-lg border border-[var(--semantic-border-interactive)] bg-[var(--semantic-background-danger)] px-4 py-4 text-sm text-[var(--semantic-status-danger)]">
          {model.error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DataMetricCard
          title="Товаров"
          value={formatNumber(model.summary?.counts.products)}
          description="Позиции, доступные в текущем индексе каталога."
          icon={<Database className="size-5" />}
        />
        <DataMetricCard
          title="Контрактов"
          value={formatNumber(model.summary?.counts.contracts)}
          description="История закупок, используемая при персонализации."
          icon={<FolderSync className="size-5" />}
        />
        <DataMetricCard
          title="Импортов"
          value={formatNumber(model.summary?.imports.length)}
          description="Всего зарегистрированных операций загрузки данных."
          icon={<ListChecks className="size-5" />}
        />
      </div>

      <AppCard tone="info">
        <AppCardHeader className="pb-3">
          <SectionTitle
            title="Операции с базой"
            description="Быстрый старт, очистка базы, дозагрузка CSV и статус последнего импорта собраны в одном рабочем разделе."
          />
        </AppCardHeader>
        <AppCardContent>
          <DataSection
            datasetBusy={model.datasetBusy}
            displayedJob={model.displayedJob}
            mode={model.mode}
            steFile={model.steFile}
            contractsFile={model.contractsFile}
            onModeChange={model.setMode}
            onSteFileChange={model.setSteFile}
            onContractsFileChange={model.setContractsFile}
            onBootstrap={() => void model.handleBootstrap()}
            onClear={() => void model.handleClear()}
            onUpload={() => void model.handleUpload()}
          />
        </AppCardContent>
      </AppCard>
    </div>
  )
}
