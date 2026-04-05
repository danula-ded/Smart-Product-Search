import * as React from "react"

import { cn } from "@/shared/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-input bg-[var(--semantic-background-elevated)] px-3.5 py-2 text-base text-foreground transition-[background-color,border-color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[var(--semantic-text-muted)] hover:border-[var(--semantic-border-strong)] focus-visible:border-[var(--semantic-border-strong)] focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus-ring)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--semantic-control-disabled)] disabled:text-[var(--semantic-text-muted)] disabled:opacity-100 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-[var(--semantic-focus-ring)] md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
