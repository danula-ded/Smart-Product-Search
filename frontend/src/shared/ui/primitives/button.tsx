import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/shared/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap tracking-tight transition-[background-color,border-color,color] outline-none select-none focus-visible:border-[var(--semantic-border-strong)] focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus-ring)] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-[var(--semantic-focus-ring)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground hover:bg-[var(--semantic-button-hover)] active:bg-[var(--semantic-button-active)]",
        outline:
          "border-border bg-[var(--semantic-background-elevated)] text-foreground hover:border-[var(--semantic-border-strong)] hover:bg-[var(--semantic-control-hover)] aria-expanded:bg-[var(--semantic-control-hover)] aria-expanded:text-foreground",
        secondary:
          "border-[var(--semantic-button-secondary)] bg-[var(--semantic-button-secondary)] text-[var(--semantic-text-on-accent)] hover:bg-[var(--semantic-button-secondary-hover)] active:bg-[var(--semantic-button-secondary-active)]",
        ghost:
          "bg-transparent text-[var(--semantic-link-primary)] hover:bg-[var(--semantic-control-hover)] hover:text-[var(--semantic-link-hover)] aria-expanded:bg-[var(--semantic-control-hover)] aria-expanded:text-[var(--semantic-link-hover)]",
        destructive:
          "border-[var(--semantic-border-interactive)] bg-[var(--semantic-background-danger)] text-[var(--semantic-status-danger)] shadow-none hover:bg-[var(--semantic-background-highlight)] focus-visible:border-[var(--semantic-border-interactive)]",
        link: "bg-transparent text-[var(--semantic-link-primary)] underline-offset-4 shadow-none hover:text-[var(--semantic-link-hover)] hover:underline",
      },
      size: {
        default:
          "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 rounded-md px-2.5 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 rounded-md px-3 text-[0.82rem] in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-5 text-[0.95rem] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-10",
        "icon-xs":
          "size-7 rounded-md in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-9 rounded-md in-data-[slot=button-group]:rounded-md",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
