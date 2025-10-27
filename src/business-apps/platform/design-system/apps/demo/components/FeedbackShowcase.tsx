import {
  Alert,
  AlertDescription,
  AlertTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Button,
  Spinner,
  toast
} from '@newwork/nw-design-system'
import ComponentShowcase from './ComponentShowcase'

/**
 * Comprehensive showcase of all feedback and overlay components
 */
export function FeedbackShowcase() {
  return (
    <div className="gba:space-y-8" data-testid="feedback-showcase">
      {/* Alerts */}
      <ComponentShowcase title="Alert Components" description="Alert messages for different types of notifications">
        <div className="gba:space-y-4">
          <Alert data-testid="alert-info">
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>This is an informational alert message to provide context to users.</AlertDescription>
          </Alert>

          <Alert variant="destructive" data-testid="alert-error">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Something went wrong. Please check your input and try again.</AlertDescription>
          </Alert>
        </div>
      </ComponentShowcase>

      {/* Toast Notifications */}
      <ComponentShowcase title="Toast Notifications" description="Temporary notification messages with Sonner">
        <div className="gba:space-y-4">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Basic Toasts</h4>
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              <Button variant="outline" onClick={() => toast('Default notification')} data-testid="toast-default">
                Default Toast
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.success('Operation completed successfully!')}
                data-testid="toast-success"
              >
                Success Toast
              </Button>
              <Button variant="outline" onClick={() => toast.error('An error occurred!')} data-testid="toast-error">
                Error Toast
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.warning('Please review your input.')}
                data-testid="toast-warning"
              >
                Warning Toast
              </Button>
            </div>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Advanced Toasts</h4>
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              <Button
                variant="outline"
                onClick={() => toast.info('This is an informational message.')}
                data-testid="toast-info"
              >
                Info Toast
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  toast('Action required', {
                    action: {
                      label: 'Undo',
                      onClick: () => toast('Action undone!')
                    }
                  })
                }
                data-testid="toast-action"
              >
                Toast with Action
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  toast('Event created', {
                    description: 'Your event has been scheduled for tomorrow at 2 PM',
                    action: {
                      label: 'View',
                      onClick: () => toast('Opening event details...')
                    }
                  })
                }
                data-testid="toast-rich"
              >
                Rich Toast
              </Button>
            </div>
          </div>
        </div>
      </ComponentShowcase>

      {/* Dialogs */}
      <ComponentShowcase title="Dialog Components" description="Modal dialogs for user interaction and confirmation">
        <div className="gba:space-y-4">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Basic Dialog</h4>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="basic-dialog-trigger">
                  Open Dialog
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="basic-dialog-content">
                <DialogHeader>
                  <DialogTitle>Dialog Title</DialogTitle>
                  <DialogDescription>
                    This is a basic dialog example. It provides a way to display content in a modal overlay that
                    requires user attention.
                  </DialogDescription>
                </DialogHeader>
                <div className="gba:py-4">
                  <p className="gba:text-sm gba:text-muted-foreground">
                    Dialog content goes here. You can add forms, information, or any other content.
                  </p>
                </div>
                <div className="gba:flex gba:justify-end gba:space-x-2">
                  <Button variant="outline">Cancel</Button>
                  <Button>Continue</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Alert Dialog</h4>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" data-testid="alert-dialog-trigger">
                  Delete Item
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent data-testid="alert-dialog-content">
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the item and remove it from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => toast.success('Item deleted successfully')}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </ComponentShowcase>

      {/* Popover */}
      <ComponentShowcase title="Popover Components" description="Floating content panels triggered by user interaction">
        <div className="gba:space-y-4">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Basic Popover</h4>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" data-testid="popover-trigger">
                  Open Popover
                </Button>
              </PopoverTrigger>
              <PopoverContent className="gba:w-80" data-testid="popover-content">
                <div className="gba:space-y-2">
                  <h4 className="gba:font-medium">Popover Content</h4>
                  <p className="gba:text-sm gba:text-muted-foreground">
                    This is a popover that appears when you click the trigger button. It can contain any content you
                    need.
                  </p>
                  <div className="gba:flex gba:gap-2">
                    <Button size="sm">Action</Button>
                    <Button size="sm" variant="outline">
                      Cancel
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </ComponentShowcase>

      {/* Tooltip */}
      <ComponentShowcase title="Tooltip Components" description="Contextual information that appears on hover">
        <div className="gba:space-y-4">
          <TooltipProvider>
            <div className="gba:flex gba:gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" data-testid="tooltip-basic">
                    Hover for Tooltip
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This is a helpful tooltip message</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" data-testid="tooltip-detailed">
                    Detailed Tooltip
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="gba:space-y-1">
                    <p className="gba:font-medium">Advanced Feature</p>
                    <p className="gba:text-xs">This button provides advanced functionality</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </ComponentShowcase>

      {/* Hover Card */}
      <ComponentShowcase title="Hover Card" description="Rich content that appears when hovering over elements">
        <div className="gba:space-y-4">
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="link" data-testid="hover-card-trigger">
                @username
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="gba:w-80" data-testid="hover-card-content">
              <div className="gba:space-y-2">
                <div>
                  <h4 className="gba:text-sm gba:font-semibold">@username</h4>
                  <p className="gba:text-sm gba:text-muted-foreground">
                    Software Developer at NEWWORK SE. Building amazing user experiences with modern web technologies.
                  </p>
                </div>
                <div className="gba:flex gba:items-center gba:text-xs gba:text-muted-foreground">
                  <span>Joined December 2021</span>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      </ComponentShowcase>

      {/* Loading States */}
      <ComponentShowcase title="Loading States" description="Spinner components for indicating loading states">
        <div className="gba:space-y-6">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Spinner Sizes</h4>
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:flex-col gba:items-center">
                <Spinner size="sm" data-testid="spinner-sm" />
                <span className="gba:text-xs gba:mt-1">Small</span>
              </div>
              <div className="gba:flex gba:flex-col gba:items-center">
                <Spinner size="md" data-testid="spinner-md" />
                <span className="gba:text-xs gba:mt-1">Medium</span>
              </div>
              <div className="gba:flex gba:flex-col gba:items-center">
                <Spinner size="lg" data-testid="spinner-lg" />
                <span className="gba:text-xs gba:mt-1">Large</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Spinner Variants</h4>
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:flex-col gba:items-center">
                <Spinner variant="default" data-testid="spinner-default" />
                <span className="gba:text-xs gba:mt-1">Default</span>
              </div>
              <div className="gba:flex gba:flex-col gba:items-center">
                <Spinner variant="secondary" data-testid="spinner-secondary" />
                <span className="gba:text-xs gba:mt-1">Secondary</span>
              </div>
              <div className="gba:flex gba:flex-col gba:items-center">
                <Spinner variant="accent" data-testid="spinner-accent" />
                <span className="gba:text-xs gba:mt-1">Accent</span>
              </div>
            </div>
          </div>
        </div>
      </ComponentShowcase>
    </div>
  )
}

export default FeedbackShowcase
