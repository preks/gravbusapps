"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "../../../lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn("gba:fixed gba:top-0 gba:z-[100] gba:flex gba:max-h-screen gba:w-full gba:flex-col-reverse gba:p-4 gba:sm:bottom-0 gba:sm:right-0 gba:sm:top-auto gba:sm:flex-col gba:md:max-w-[420px]", className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva("gba:group gba:pointer-events-auto gba:relative gba:flex gba:w-full gba:items-center gba:justify-between gba:space-x-4 gba:overflow-hidden gba:rounded-md gba:border gba:p-6 gba:pr-8 gba:shadow-lg gba:transition-all gba:data-[swipe=cancel]:translate-x-0 gba:data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] gba:data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] gba:data-[swipe=move]:transition-none gba:data-[state=open]:animate-in gba:data-[state=closed]:animate-out gba:data-[swipe=end]:animate-out gba:data-[state=closed]:fade-out-80 gba:data-[state=closed]:slide-out-to-right-full gba:data-[state=open]:slide-in-from-top-full gba:data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn("gba:inline-flex gba:h-8 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-md gba:border gba:bg-transparent gba:px-3 gba:text-sm gba:font-medium gba:ring-offset-background gba:transition-colors gba:hover:bg-secondary gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-ring gba:focus:ring-offset-2 gba:disabled:cursor-not-allowed gba:disabled:opacity-50 gba:group-[.destructive]:border-muted/40 gba:group-[.destructive]:hover:border-destructive/30 gba:group-[.destructive]:hover:bg-destructive gba:group-[.destructive]:hover:text-destructive-foreground gba:group-[.destructive]:focus:ring-destructive", className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn("gba:absolute gba:right-2 gba:top-2 gba:rounded-md gba:p-1 gba:text-foreground/50 gba:opacity-0 gba:transition-opacity gba:hover:text-foreground gba:focus:opacity-100 gba:focus:outline-none gba:focus:ring-2 gba:group-hover:opacity-100 group-[.destructive]:text-red-300 gba:group-[.destructive]:hover:text-red-50 gba:group-[.destructive]:focus:ring-red-400 gba:group-[.destructive]:focus:ring-offset-red-600", className
    )}
    toast-close=""
    {...props}
  >
    <X className="gba:h-4 gba:w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("gba:text-sm gba:font-semibold", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("gba:text-sm gba:opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
