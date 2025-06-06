"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "../../lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn("gba:peer gba:h-4 gba:w-4 gba:shrink-0 gba:rounded-sm gba:border gba:border-primary gba:ring-offset-background gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring gba:focus-visible:ring-offset-2 gba:disabled:cursor-not-allowed gba:disabled:opacity-50 gba:data-[state=checked]:bg-primary gba:data-[state=checked]:text-primary-foreground", className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("gba:flex gba:items-center gba:justify-center gba:text-current")}
    >
      <Check className="gba:h-4 gba:w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
