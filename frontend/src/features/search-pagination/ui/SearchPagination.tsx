import { ChevronLeft, ChevronRight } from 'lucide-react'

import { pageSizeOptions } from '@/shared/constants/search'
import { formatNumber } from '@/shared/lib/format'
import { buildVisiblePages } from '@/shared/lib/search'
import {
  AppButton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'

type SearchPaginationProps = {
  currentPage: number
  totalPages: number
  pageSize: number
  totalCount: number
  disabled?: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function SearchPagination({
  currentPage,
  totalPages,
  pageSize,
  totalCount,
  disabled,
  onPageChange,
  onPageSizeChange,
}: SearchPaginationProps) {
  const visiblePages = buildVisiblePages(currentPage, totalPages)

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-card)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-[var(--semantic-text-secondary)]">
        {`Показано ${formatNumber(pageSize)} на странице, всего ${formatNumber(totalCount)}`}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger size="sm" className="w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((value) => (
              <SelectItem key={value} value={String(value)}>
                {value} / стр.
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <AppButton
          size="icon-sm"
          variant="outline"
          disabled={disabled || currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="size-4" />
        </AppButton>

        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) =>
            page === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="px-2 text-sm text-[var(--semantic-text-muted)]">
                …
              </span>
            ) : (
              <AppButton
                key={page}
                size="sm"
                variant={page === currentPage ? 'primary' : 'outline'}
                disabled={disabled}
                onClick={() => onPageChange(page)}
              >
                {page}
              </AppButton>
            ),
          )}
        </div>

        <AppButton
          size="icon-sm"
          variant="outline"
          disabled={disabled || currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="size-4" />
        </AppButton>
      </div>
    </div>
  )
}
