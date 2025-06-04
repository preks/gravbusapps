"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "../../lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn("gba:flex gba:h-10 gba:w-full gba:items-center gba:justify-between gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:ring-offset-background gba:placeholder:text-muted-foreground gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-ring gba:focus:ring-offset-2 gba:disabled:cursor-not-allowed gba:disabled:opacity-50 gba:[&_span]:line-clamp-1", className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="gba:h-4 gba:w-4 gba:opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("gba:flex gba:cursor-default gba:items-center gba:justify-center gba:py-1", className
    )}
    {...props}
  >
    <ChevronUp className="gba:h-4 gba:w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("gba:flex gba:cursor-default gba:items-center gba:justify-center gba:py-1", className
    )}
    {...props}
  >
    <ChevronDown className="gba:h-4 gba:w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn("gba:relative gba:z-50 gba:max-h-96 gba:min-w-[8rem] gba:overflow-hidden gba:rounded-md gba:border gba:bg-popover gba:text-popover-foreground gba:shadow-md gba:data-[state=open]:animate-in gba:data-[state=closed]:animate-out gba:data-[state=closed]:fade-out-0 gba:data-[state=open]:fade-in-0 gba:data-[state=closed]:zoom-out-95 gba:data-[state=open]:zoom-in-95 gba:data-[side=bottom]:slide-in-from-top-2 gba:data-[side=left]:slide-in-from-right-2 gba:data-[side=right]:slide-in-from-left-2 gba:data-[side=top]:slide-in-from-bottom-2", position === "popper" &&
          "gba:data-[side=bottom]:translate-y-1 gba:data-[side=left]:-translate-x-1 gba:data-[side=right]:translate-x-1 gba:data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn("gba:p-1", position === "popper" &&
            "gba:h-[var(--radix-select-trigger-height)] gba:w-full gba:min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("gba:py-1.5 gba:pl-8 gba:pr-2 gba:text-sm gba:font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn("gba:relative gba:flex gba:w-full gba:cursor-default gba:select-none gba:items-center gba:rounded-sm gba:py-1.5 gba:pl-8 gba:pr-2 gba:text-sm gba:outline-none gba:focus:bg-accent gba:focus:text-accent-foreground gba:data-[disabled]:pointer-events-none gba:data-[disabled]:opacity-50", className
    )}
    {...props}
  >
    <span className="gba:absolute gba:left-2 gba:flex gba:h-3.5 gba:w-3.5 gba:items-center gba:justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="gba:h-4 gba:w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("gba:-mx-1 gba:my-1 gba:h-px gba:bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
