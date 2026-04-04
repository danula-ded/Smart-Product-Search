import type { SearchResult } from '@/entities/product'
import { ProductCard } from '@/entities/product'
import { Skeleton } from '@/shared/ui'

type ProductGridProps = {
  results: SearchResult[]
  offset: number
  loading: boolean
  showInitialSkeletons: boolean
  onOpen: (result: SearchResult, position: number) => void
  onRelevant: (result: SearchResult, position: number) => void
  onIrrelevant: (result: SearchResult, position: number) => void
  onBounce: (result: SearchResult, position: number) => void
  onSave: (result: SearchResult, position: number) => void
  onDetails: (result: SearchResult) => void
}

export function ProductGrid({
  results,
  offset,
  loading,
  showInitialSkeletons,
  onOpen,
  onRelevant,
  onIrrelevant,
  onBounce,
  onSave,
  onDetails,
}: ProductGridProps) {
  if (loading && showInitialSkeletons) {
    return (
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className="rounded-xl border border-[var(--semantic-border-default)] bg-[var(--semantic-background-card)] p-5"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-8 w-full" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
            <Skeleton className="mt-5 h-24 w-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {results.map((result, index) => {
        const position = offset + index + 1

        return (
          <ProductCard
            key={result.product.id}
            result={result}
            position={position}
            onOpen={() => onOpen(result, position)}
            onRelevant={() => onRelevant(result, position)}
            onIrrelevant={() => onIrrelevant(result, position)}
            onBounce={() => onBounce(result, position)}
            onSave={() => onSave(result, position)}
            onDetails={() => onDetails(result)}
          />
        )
      })}
    </div>
  )
}
