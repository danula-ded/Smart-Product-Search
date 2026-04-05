import { Skeleton } from '@/shared/ui'

export function ProductPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-32 rounded-lg" />

      <div className="space-y-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-5 w-56" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--semantic-border-default)] bg-[var(--semantic-background-card)] p-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
          </div>

          <div className="rounded-xl border border-[var(--semantic-border-default)] bg-[var(--semantic-background-card)] p-6">
            <Skeleton className="h-4 w-36" />
            <div className="mt-4 flex flex-wrap gap-2">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-28 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--semantic-border-default)] bg-[var(--semantic-background-card)] p-6">
            <Skeleton className="h-4 w-32" />
            <div className="mt-4 flex flex-wrap gap-2">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
