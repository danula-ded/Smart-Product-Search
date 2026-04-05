import type { SearchResult } from '@/entities/product'
import { ProductCard, ProductCardSkeleton } from '@/entities/product'

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
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className="min-w-0 basis-full md:basis-[calc(50%-0.5rem)] 2xl:basis-[calc(33.333%-0.75rem)]"
          >
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-4">
      {results.map((result, index) => {
        const position = offset + index + 1

        return (
          <div
            key={result.product.id}
            className="min-w-0 basis-full md:basis-[calc(50%-0.5rem)] 2xl:basis-[calc(33.333%-0.75rem)]"
          >
            <ProductCard
              result={result}
              position={position}
              onOpen={() => onOpen(result, position)}
              onRelevant={() => onRelevant(result, position)}
              onIrrelevant={() => onIrrelevant(result, position)}
              onBounce={() => onBounce(result, position)}
              onSave={() => onSave(result, position)}
              onDetails={() => onDetails(result)}
            />
          </div>
        )
      })}
    </div>
  )
}
