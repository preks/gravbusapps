"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronRight, Circle } from "lucide-react"
import { cn } from "../../../lib/utils"

const DropdownMenu = DropdownMenuPrimitive.Root

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuGroup = DropdownMenuPrimitive.Group

const DropdownMenuPortal = DropdownMenuPrimitive.Portal

const DropdownMenuSub = DropdownMenuPrimitive.Sub

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn("gba:flex gba:cursor-default gba:gap-2 gba:select-none gba:items-center gba:rounded-sm gba:px-2 gba:py-1.5 gba:text-sm gba:outline-none gba:focus:bg-accent gba:data-[state=open]:bg-accent gba:[&_svg]:pointer-events-none gba:[&_svg]:size-4 gba:[&_svg]:shrink-0", inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="gba:ml-auto" />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn("gba:z-50 gba:min-w-[8rem] gba:overflow-hidden gba:rounded-md gba:border gba:bg-popover gba:p-1 gba:text-popover-foreground gba:shadow-lg gba:data-[state=open]:animate-in gba:data-[state=closed]:animate-out gba:data-[state=closed]:fade-out-0 gba:data-[state=open]:fade-in-0 gba:data-[state=closed]:zoom-out-95 gba:data-[state=open]:zoom-in-95 gba:data-[side=bottom]:slide-in-from-top-2 gba:data-[side=left]:slide-in-from-right-2 gba:data-[side=right]:slide-in-from-left-2 gba:data-[side=top]:slide-in-from-bottom-2", className
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn("gba:z-50 gba:min-w-[8rem] gba:overflow-hidden gba:rounded-md gba:border gba:bg-popover gba:p-1 gba:text-popover-foreground gba:shadow-md gba:data-[state=open]:animate-in gba:data-[state=closed]:animate-out gba:data-[state=closed]:fade-out-0 gba:data-[state=open]:fade-in-0 gba:data-[state=closed]:zoom-out-95 gba:data-[state=open]:zoom-in-95 gba:data-[side=bottom]:slide-in-from-top-2 gba:data-[side=left]:slide-in-from-right-2 gba:data-[side=right]:slide-in-from-left-2 gba:data-[side=top]:slide-in-from-bottom-2", className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn("gba:relative gba:flex gba:cursor-default gba:select-none gba:items-center gba:gap-2 gba:rounded-sm gba:px-2 gba:py-1.5 gba:text-sm gba:outline-none gba:transition-colors gba:focus:bg-accent gba:focus:text-accent-foreground gba:data-[disabled]:pointer-events-none gba:data-[disabled]:opacity-50 gba:[&_svg]:pointer-events-none gba:[&_svg]:size-4 gba:[&_svg]:shrink-0", inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn("gba:relative gba:flex gba:cursor-default gba:select-none gba:items-center gba:rounded-sm gba:py-1.5 gba:pl-8 gba:pr-2 gba:text-sm gba:outline-none gba:transition-colors gba:focus:bg-accent gba:focus:text-accent-foreground gba:data-[disabled]:pointer-events-none gba:data-[disabled]:opacity-50", className
    )}
    checked={checked}
    {...props}
  >
    <span className="gba:absolute gba:left-2 gba:flex gba:h-3.5 gba:w-3.5 gba:items-center gba:justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="gba:h-4 gba:w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn("gba:relative gba:flex gba:cursor-default gba:select-none gba:items-center gba:rounded-sm gba:py-1.5 gba:pl-8 gba:pr-2 gba:text-sm gba:outline-none gba:transition-colors gba:focus:bg-accent gba:focus:text-accent-foreground gba:data-[disabled]:pointer-events-none gba:data-[disabled]:opacity-50", className
    )}
    {...props}
  >
    <span className="gba:absolute gba:left-2 gba:flex gba:h-3.5 gba:w-3.5 gba:items-center gba:justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="gba:h-2 gba:w-2 gba:fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn("gba:px-2 gba:py-1.5 gba:text-sm gba:font-semibold", inset && "gba:pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("gba:-mx-1 gba:my-1 gba:h-px gba:bg-muted", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("gba:ml-auto gba:text-xs gba:tracking-widest gba:opacity-60", className)}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
