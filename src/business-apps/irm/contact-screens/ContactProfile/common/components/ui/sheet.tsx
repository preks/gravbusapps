"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "../../../lib/utils"

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn("gba:fixed gba:inset-0 gba:z-50 gba:bg-black/80 gba:data-[state=open]:animate-in gba:data-[state=closed]:animate-out gba:data-[state=closed]:fade-out-0 gba:data-[state=open]:fade-in-0", className
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva("gba:fixed gba:z-50 gba:gap-4 gba:bg-background gba:p-6 gba:shadow-lg gba:transition gba:ease-in-out gba:data-[state=open]:animate-in gba:data-[state=closed]:animate-out gba:data-[state=closed]:duration-300 gba:data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b gba:data-[state=closed]:slide-out-to-top gba:data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t gba:data-[state=closed]:slide-out-to-bottom gba:data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r gba:data-[state=closed]:slide-out-to-left gba:data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4  border-l gba:data-[state=closed]:slide-out-to-right gba:data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      {children}
      <SheetPrimitive.Close className="gba:absolute gba:right-4 gba:top-4 gba:rounded-sm gba:opacity-70 gba:ring-offset-background gba:transition-opacity gba:hover:opacity-100 gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-ring gba:focus:ring-offset-2 gba:disabled:cursor-not-allowed gba:disabled:opacity-50 gba:data-[state=open]:bg-secondary">
        <X className="gba:h-4 gba:w-4" />
        <span className="gba:sr-only">Close</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("gba:flex gba:flex-col gba:space-y-2 gba:text-center gba:sm:text-left", className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("gba:flex gba:flex-col-reverse gba:sm:flex-row gba:sm:justify-end gba:sm:space-x-2", className
    )}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("gba:text-lg gba:font-semibold gba:text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("gba:text-sm gba:text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
