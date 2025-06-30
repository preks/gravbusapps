import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../../lib/utils"

const badgeVariants = cva("gba:inline-flex gba:items-center gba:rounded-full gba:border gba:px-2.5 gba:py-0.5 gba:text-xs gba:font-semibold gba:transition-colors gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-ring gba:focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "gba:border-transparent gba:bg-primary gba:text-primary-foreground gba:hover:bg-primary/80",
        secondary:
          "gba:border-transparent gba:bg-secondary gba:text-secondary-foreground gba:hover:bg-secondary/80",
        destructive:
          "gba:border-transparent gba:bg-destructive gba:text-destructive-foreground gba:hover:bg-destructive/80",
        outline: "gba:text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
