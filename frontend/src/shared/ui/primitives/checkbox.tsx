import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "@/shared/lib/utils"
import { CheckIcon } from "lucide-react"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-input bg-[var(--semantic-background-elevated)] transition-colors outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-[var(--semantic-border-strong)] focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus-ring)] disabled:cursor-not-allowed disabled:bg-[var(--semantic-control-disabled)] disabled:opacity-100 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-[var(--semantic-focus-ring)] aria-invalid:aria-checked:border-primary data-checked:border-[var(--semantic-selected-border)] data-checked:bg-[var(--semantic-selected-surface)] data-checked:text-[var(--semantic-status-success)]",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
