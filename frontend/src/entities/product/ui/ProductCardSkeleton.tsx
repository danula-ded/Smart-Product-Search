import { Skeleton } from '@/shared/ui'

export function ProductCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--semantic-border-default)] bg-[var(--semantic-background-card)] p-5">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="mt-4 h-8 w-full" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-5/6" />
      <div className="mt-5 flex flex-wrap gap-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      <Skeleton className="mt-5 h-24 w-full" />
    </div>
  )
}
