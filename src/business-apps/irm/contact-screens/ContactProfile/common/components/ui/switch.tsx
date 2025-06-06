"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "../../../lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn("gba:peer gba:inline-flex gba:h-6 gba:w-11 gba:shrink-0 gba:cursor-pointer gba:items-center gba:rounded-full gba:border-2 gba:border-transparent gba:transition-colors gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring gba:focus-visible:ring-offset-2 gba:focus-visible:ring-offset-background gba:disabled:cursor-not-allowed gba:disabled:opacity-50 gba:data-[state=checked]:bg-primary gba:data-[state=unchecked]:bg-input", className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn("gba:pointer-events-none gba:block gba:h-5 gba:w-5 gba:rounded-full gba:bg-background gba:shadow-lg gba:ring-0 gba:transition-transform gba:data-[state=checked]:translate-x-5 gba:data-[state=unchecked]:translate-x-0",  )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
