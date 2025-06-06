import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva("gba:inline-flex gba:items-center gba:justify-center gba:gap-2 gba:whitespace-nowrap gba:rounded-md gba:text-sm gba:font-medium gba:ring-offset-background gba:transition-colors gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring gba:focus-visible:ring-offset-2 gba:disabled:pointer-events-none gba:disabled:opacity-50 gba:[&_svg]:pointer-events-none gba:[&_svg]:size-4 gba:[&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "gba:bg-primary gba:text-primary-foreground gba:hover:bg-primary/90",
        destructive:
          "gba:bg-destructive gba:text-destructive-foreground gba:hover:bg-destructive/90",
        outline:
          "gba:border gba:border-input gba:bg-background gba:hover:bg-accent gba:hover:text-accent-foreground",
        secondary:
          "gba:bg-secondary gba:text-secondary-foreground gba:hover:bg-secondary/80",
        ghost: "gba:hover:bg-accent gba:hover:text-accent-foreground",
        link: "gba:text-primary gba:underline-offset-4 gba:hover:underline",
      },
      size: {
        default: "gba:h-10 gba:px-4 gba:py-2",
        sm: "gba:h-9 gba:rounded-md gba:px-3",
        lg: "gba:h-11 gba:rounded-md gba:px-8",
        icon: "gba:h-10 gba:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
