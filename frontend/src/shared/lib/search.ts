import type { SearchFilters } from '@/shared/api/backend'

export function createSessionId() {
  return `session-${Math.random().toString(36).slice(2, 10)}`
}

export function countActiveFilters(filters: SearchFilters) {
  return (
    (filters.categories?.length ?? 0) +
    (filters.brands?.length ?? 0) +
    (filters.attributes?.length ?? 0)
  )
}

export function asText(value: unknown) {
  return typeof value === 'string' ? value : ''
}

export function toggleArrayValue(values: string[] | undefined, value: string, checked: boolean) {
  const current = new Set(values ?? [])
  if (checked) {
    current.add(value)
  } else {
    current.delete(value)
  }

  return Array.from(current)
}

export function buildVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
  if (currentPage <= 3) {
    pages.add(2)
    pages.add(3)
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1)
    pages.add(totalPages - 2)
  }

  const sorted = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right)

  const output: Array<number | 'ellipsis'> = []
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) {
      output.push('ellipsis')
    }
    output.push(page)
  })

  return output
}
