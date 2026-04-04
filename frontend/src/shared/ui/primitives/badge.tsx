import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/shared/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-transparent px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap tracking-[0.02em] transition-colors focus-visible:border-[var(--semantic-border-strong)] focus-visible:ring-[3px] focus-visible:ring-[var(--semantic-focus-ring)] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-[var(--semantic-focus-ring)] [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground [a]:hover:bg-[var(--semantic-button-hover)]",
        secondary:
          "border-[var(--semantic-border-strong)] bg-[var(--semantic-background-info)] text-[var(--semantic-status-info)] [a]:hover:bg-[var(--semantic-background-section)]",
        destructive:
          "border-[var(--semantic-border-interactive)] bg-[var(--semantic-background-danger)] text-[var(--semantic-status-danger)] [a]:hover:bg-[var(--semantic-background-highlight)]",
        outline:
          "border-border bg-transparent text-foreground [a]:hover:bg-[var(--semantic-background-section)] [a]:hover:text-foreground",
        ghost:
          "border-transparent bg-[var(--semantic-background-section)] text-[var(--semantic-text-secondary)] hover:bg-[var(--semantic-background-info)] hover:text-foreground",
        link: "text-[var(--semantic-link-primary)] underline-offset-4 hover:text-[var(--semantic-link-hover)] hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
