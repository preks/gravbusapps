"use client"

import * as React from "react"

import { cn } from "../../lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn("gba:flex gba:h-10 gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-base gba:ring-offset-background gba:file:border-0 gba:file:bg-transparent gba:file:text-sm gba:file:font-medium gba:file:text-foreground gba:placeholder:text-muted-foreground gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring gba:focus-visible:ring-offset-2 gba:disabled:cursor-not-allowed gba:disabled:opacity-50 gba:md:text-sm", className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
