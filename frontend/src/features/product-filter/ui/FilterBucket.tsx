import type { SearchFacetBucket } from '@/shared/api'
import { Checkbox } from '@/shared/ui'
import { formatNumber } from '@/shared/lib/format'

type FilterBucketProps = {
  checked: boolean
  bucket: SearchFacetBucket
  onChange: (checked: boolean) => void
}

export function FilterBucket({ checked, bucket, onChange }: FilterBucketProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] px-3 py-3 text-sm transition-colors hover:border-[var(--semantic-border-strong)] hover:bg-[var(--semantic-control-hover)]">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(Boolean(value))} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-[var(--semantic-text-primary)]">{bucket.value}</div>
        <div className="text-xs text-[var(--semantic-text-muted)]">{formatNumber(bucket.count)}</div>
      </div>
    </label>
  )
}
