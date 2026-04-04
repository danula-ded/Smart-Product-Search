import type { UploadMode } from '@/shared/api'
import { incrementalModes } from '@/shared/constants/search'
import { AppButton, AppInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui'
import { FolderSync } from 'lucide-react'

type DatasetUploadFormProps = {
  mode: UploadMode
  steFile: File | null
  contractsFile: File | null
  datasetBusy: boolean
  onModeChange: (mode: UploadMode) => void
  onSteFileChange: (file: File | null) => void
  onContractsFileChange: (file: File | null) => void
  onUpload: () => void
}

export function DatasetUploadForm({
  mode,
  steFile,
  contractsFile,
  datasetBusy,
  onModeChange,
  onSteFileChange,
  onContractsFileChange,
  onUpload,
}: DatasetUploadFormProps) {
  const disabled =
    datasetBusy ||
    (mode === 'upsert_ste' && !steFile) ||
    (mode === 'append_contracts' && !contractsFile) ||
    (mode === 'upsert_bundle' && (!steFile || !contractsFile))

  return (
    <div className="rounded-xl border border-[var(--semantic-border-default)] bg-[var(--semantic-background-card)] p-6">
      <div className="space-y-2">
        <div className="text-lg font-semibold text-[var(--semantic-text-primary)]">Дозагрузка данных</div>
        <div className="text-sm leading-6 text-[var(--semantic-text-secondary)]">
          Для новых файлов заказчика: выбор режима, загрузка CSV и отслеживание фоновой обработки.
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[220px_1fr_1fr_auto] xl:items-end">
        <div className="space-y-2">
          <span className="text-sm font-medium text-[var(--semantic-text-primary)]">Режим</span>
          <Select value={mode} onValueChange={(value) => onModeChange(value as UploadMode)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {incrementalModes.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs leading-5 text-[var(--semantic-text-muted)]">
            {incrementalModes.find((item) => item.value === mode)?.description}
          </p>
        </div>

        <AppInput
          label="Файл СТЕ"
          type="file"
          accept=".csv"
          onChange={(event) => onSteFileChange(event.target.files?.[0] ?? null)}
        />

        <AppInput
          label="Файл контрактов"
          type="file"
          accept=".csv"
          onChange={(event) => onContractsFileChange(event.target.files?.[0] ?? null)}
        />

        <AppButton disabled={disabled} onClick={onUpload}>
          <FolderSync className="size-4" />
          Запустить
        </AppButton>
      </div>
    </div>
  )
}
