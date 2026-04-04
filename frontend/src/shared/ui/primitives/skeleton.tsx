import { cn } from "@/shared/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-xl bg-[var(--semantic-background-section)]", className)}
      {...props}
    />
  )
}

export { Skeleton }
