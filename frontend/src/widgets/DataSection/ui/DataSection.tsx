import type { DatasetJob, UploadMode } from '@/shared/api'
import {
  DatasetQuickActions,
  DatasetStatusCard,
  DatasetUploadForm,
} from '@/features/dataset-management'

type DataSectionProps = {
  datasetBusy: boolean
  displayedJob: DatasetJob | null
  mode: UploadMode
  steFile: File | null
  contractsFile: File | null
  onModeChange: (mode: UploadMode) => void
  onSteFileChange: (file: File | null) => void
  onContractsFileChange: (file: File | null) => void
  onBootstrap: () => void
  onClear: () => void
  onUpload: () => void
}

export function DataSection({
  datasetBusy,
  displayedJob,
  mode,
  steFile,
  contractsFile,
  onModeChange,
  onSteFileChange,
  onContractsFileChange,
  onBootstrap,
  onClear,
  onUpload,
}: DataSectionProps) {
  return (
    <div className="space-y-6">
      <DatasetQuickActions
        datasetBusy={datasetBusy}
        onBootstrap={onBootstrap}
        onClear={onClear}
      />
      <DatasetUploadForm
        mode={mode}
        steFile={steFile}
        contractsFile={contractsFile}
        datasetBusy={datasetBusy}
        onModeChange={onModeChange}
        onSteFileChange={onSteFileChange}
        onContractsFileChange={onContractsFileChange}
        onUpload={onUpload}
      />
      <DatasetStatusCard displayedJob={displayedJob} />
    </div>
  )
}
