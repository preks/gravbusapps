/// <reference types="vite/client" />
import { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { ThemeProvider } from './components/ThemeProvider';
import {
    Button,
    Accordion, AccordionContent, AccordionItem, AccordionTrigger,
    Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter, CardAction,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
    Input,
    Label,
    Checkbox,
    RadioGroup, RadioGroupItem,
    Switch,
    Textarea,
    Slider,
    Tabs, TabsContent, TabsList, TabsTrigger,
    Avatar, AvatarFallback, AvatarImage,
    Badge,
    Progress,
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
    Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow,
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
    Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
    Calendar,
    Popover, PopoverContent, PopoverTrigger,
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
    Alert, AlertDescription, AlertTitle,
    ScrollArea,
    Separator,
    Toggle,
    ToggleGroup, ToggleGroupItem,
    HoverCard, HoverCardContent, HoverCardTrigger,
    Skeleton,
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
    NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger,
    Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator,
    AspectRatio,
    Collapsible, CollapsibleContent, CollapsibleTrigger,
    Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
    Combobox,
    ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
    Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger,
    Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
    Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious,
    ChartContainer, ChartTooltip, ChartTooltipContent,
    Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger,
    InputOTP, InputOTPGroup, InputOTPSlot,
    ResizableHandle, ResizablePanel, ResizablePanelGroup,
    Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
    Toaster,
    ThemeSwitch,
    ActionButton,
    Icon,
    Spinner,
    IconPageHeader,
    PageLayout,
    DataTable,
    PageHeader,
    SectionKpiCards
} from '@newwork/nw-design-system';

import {
    CircleWavyCheckIcon,
    Star,
    Heart,
    Bell,
    House,
    Gear,
    User,
    FolderOpen,
    Users,
    CheckCircle,
    Upload,
    Download,
    Eye,
    Phone,
    ShoppingCart,
    Shield,
    Trash,
    Plus,
    Minus,
    X,
    Check,
    Info,
    Warning,
    Lightbulb,
    Fire,
    Rocket,
    Target,
    Trophy,
    Crown,
    Diamond,
    Lock,
    LockOpen,
    Key,
    CreditCard,
    MagnifyingGlass,
    MapPin,
    Clock,
    Timer,
    FileText,
    File,
    Folder,
    Archive,
    Package,
    Tag,
    Bookmark,
    ThumbsUp,
    ThumbsDown,
    ChatCircle,
    PaperPlaneRight,
    ShareNetwork,
    ArrowSquareOut,
    Link,
    Cloud,
    CloudArrowDown,
    CloudArrowUp,
    Sun,
    Moon,
    Play,
    Pause,
    Stop,
    Image,
    VideoCamera,
    Camera,
    Monitor,
    Laptop,
    Database,
    Cpu,
    Scissors,
    Copy,
    Clipboard,
    Terminal,
    Bug,
    Code,
    Gift,
    Coffee,
    Car,
    Airplane,
    Boat,
    Snowflake,
    HardHat,
    Eyeglasses,
    Sword,
    MagicWand,
    DotsThree,
    TrendUp
} from '@phosphor-icons/react';

import { LineChart, Line, XAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form'

interface DemoProps extends BusinessAppContextProps {
    // Additional props can be added here if needed
}

const Demo: React.FC<DemoProps> = (props) => {
    const [count, setCount] = useState(0);
    const [selectedComponent, setSelectedComponent] = useState('');
    const [selectedSubView, setSelectedSubView] = useState('overview');

    // Sample actions for action-button
    const sampleActions = [
        {
            label: 'Create',
            onSelect: () => console.log('Create action selected'),
            isPrimary: true
        },
        {
            label: 'Edit',
            onSelect: () => console.log('Edit action selected')
        },
        {
            label: 'Delete',
            onSelect: () => console.log('Delete action selected')
        }
    ];

    const [components, setComponents] = useState<string[]>([]);


    // Component list for the demo
    useEffect(() => {
        const componentList = [
            'button', 'accordion', 'input', 'label', 'checkbox', 'radio-group', 'switch',
            'textarea', 'slider', 'tabs', 'avatar', 'badge', 'progress', 'tooltip', 'table',
            'dropdown-menu', 'form', 'calendar', 'alert', 'alert-dialog', 'aspect-ratio',
            'breadcrumb', 'collapsible', 'command', 'combobox', 'context-menu', 'dialog',
            'hover-card', 'menubar', 'navigation-menu', 'pagination', 'popover', 'scroll-area',
            'separator', 'sheet', 'skeleton', 'toggle', 'toggle-group', 'action-button',
            'icon', 'icon-page-header', 'spinner', 'carousel', 'chart', 'drawer', 'input-otp',
            'resizable', 'sidebar', 'sonner', 'simple-page', 'data-table', 'page-header',
            'section-kpi-cards', 'theme-switch', 'card', 'select'
        ];

        const sortedComponents = componentList.sort((a, b) => a.localeCompare(b));
        setComponents(sortedComponents);

        // Set the first component as the default selection
        if (sortedComponents.length > 0) {
            setSelectedComponent(sortedComponents[0]);
        }
    }, [])

  // Form hook - moved outside conditional render to fix hooks order
  const basicForm = useForm({
    defaultValues: {
      email: '',
      password: '',
      role: '',
      skills: '',
      experience: '',
      description: '',
      notifications: false,
    },
  })

  const onBasicSubmit = (data: any) => {
    console.log('Basic form submitted:', data)
    toast.success('Form submitted successfully!')
  }

  // Dialog form hook
  const dialogForm = useForm({
    defaultValues: {
      title: '',
      category: '',
      priority: 'medium',
      assignee: '',
      description: '',
      urgent: false,
    },
  })

  const onDialogSubmit = (data: any) => {
    console.log('Dialog form submitted:', data)
    toast.success('Task created successfully!')
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="ui-theme">
      <div className="min-h-screen p-10 bg-background">
        {/* Theme toggle in the top right corner */}
        <div className="fixed top-4 right-4 z-50">
          <ThemeSwitch />
        </div>
        <div className="container mx-auto space-y-8">
          <div className="w-full max-w-xs">
            <Select
              value={selectedComponent}
              onValueChange={setSelectedComponent}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {selectedComponent.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {components.map((component) => (
                  <SelectItem key={component} value={component}>
                    {component.split('-').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardContent>
              <div className="space-y-4">
                {selectedComponent === 'button' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Button Component</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => setCount(count => count + 1)}>
                        Count: {count}
                      </Button>
                      <Button variant="secondary">Secondary</Button>
                      <Button variant="destructive">Destructive</Button>
                      <Button variant="outline">Outline</Button>
                      <Button variant="ghost">Ghost</Button>
                      <Button variant="link">Link</Button>
                    </div>
                  </div>
                )}
                
                {selectedComponent === 'accordion' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Accordion Component</h3>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="item-1">
                        <AccordionTrigger>Is it accessible?</AccordionTrigger>
                        <AccordionContent>
                          Yes. It adheres to the WAI-ARIA design pattern.
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="item-2">
                        <AccordionTrigger>Is it styled?</AccordionTrigger>
                        <AccordionContent>
                          Yes. It comes with default styles that matches the other components.
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                )}

                {selectedComponent === 'input' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Input Component</h3>
                    <div className="flex flex-col space-y-4 max-w-md">
                      <Input placeholder="Enter your name" />
                      <Input type="email" placeholder="Email" />
                      <Input type="password" placeholder="Password" />
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="disabled">Disabled</Label>
                        <Input id="disabled" disabled placeholder="Disabled input" />
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'label' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Label Component</h3>
                    <div className="grid gap-4 max-w-sm">
                      <div className="space-y-2">
                        <Label htmlFor="first-name">First name</Label>
                        <Input id="first-name" placeholder="First name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last-name">Last name</Label>
                        <Input id="last-name" placeholder="Last name" />
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'checkbox' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Checkbox Component</h3>
                    <div className="flex items-center space-x-2 mb-4">
                      <Checkbox id="terms" />
                      <Label htmlFor="terms">Accept terms and conditions</Label>
                    </div>
                    <div className="flex items-center space-x-2 mb-4">
                      <Checkbox id="newsletter" defaultChecked />
                      <Label htmlFor="newsletter">Subscribe to newsletter</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="disabled" disabled />
                      <Label htmlFor="disabled">Disabled option</Label>
                    </div>
                  </div>
                )}

                {selectedComponent === 'radio-group' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Radio Group Component</h3>
                    <RadioGroup defaultValue="option-one">
                      <div className="flex items-center space-x-2 mb-2">
                        <RadioGroupItem value="option-one" id="option-one" />
                        <Label htmlFor="option-one">Option One</Label>
                      </div>
                      <div className="flex items-center space-x-2 mb-2">
                        <RadioGroupItem value="option-two" id="option-two" />
                        <Label htmlFor="option-two">Option Two</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="option-three" id="option-three" disabled />
                        <Label htmlFor="option-three">Option Three (Disabled)</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {selectedComponent === 'switch' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Switch Component</h3>
                    <div className="flex items-center space-x-2 mb-4">
                      <Switch id="airplane-mode" />
                      <Label htmlFor="airplane-mode">Airplane Mode</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="wifi" defaultChecked />
                      <Label htmlFor="wifi">WiFi</Label>
                    </div>
                  </div>
                )}

                {selectedComponent === 'textarea' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Textarea Component</h3>
                    <div className="space-y-4 max-w-lg">
                      <Textarea placeholder="Type your message here." />
                      <Textarea placeholder="Disabled textarea" disabled />
                    </div>
                  </div>
                )}

                {selectedComponent === 'slider' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Slider Component</h3>
                    <div className="max-w-sm space-y-8">
                      <Slider defaultValue={[50]} max={100} step={1} />
                      <Slider defaultValue={[20, 80]} max={100} step={1} />
                    </div>
                  </div>
                )}

                {selectedComponent === 'tabs' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Tabs Component</h3>
                    <Tabs defaultValue="account" className="max-w-md">
                      <TabsList>
                        <TabsTrigger value="account">Account</TabsTrigger>
                        <TabsTrigger value="password">Password</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                      </TabsList>
                      <TabsContent value="account" className="p-4 border rounded-md mt-2">
                        Account settings tab content.
                      </TabsContent>
                      <TabsContent value="password" className="p-4 border rounded-md mt-2">
                        Change password tab content.
                      </TabsContent>
                      <TabsContent value="settings" className="p-4 border rounded-md mt-2">
                        Other settings tab content.
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
                
                {selectedComponent === 'avatar' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Avatar Component</h3>
                    <div className="flex space-x-4">
                      <Avatar>
                        <AvatarImage src="https://github.com/shadcn.png" />
                        <AvatarFallback>CN</AvatarFallback>
                      </Avatar>
                      <Avatar>
                        <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                )}

                {selectedComponent === 'badge' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Badge Component</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge>Default</Badge>
                      <Badge variant="secondary">Secondary</Badge>
                      <Badge variant="outline">Outline</Badge>
                      <Badge variant="destructive">Destructive</Badge>
                    </div>
                  </div>
                )}

                {selectedComponent === 'progress' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Progress Component</h3>
                    <div className="space-y-4 max-w-md">
                      <Progress value={33} className="w-full" />
                      <Progress value={66} className="w-full" />
                      <Progress value={100} className="w-full" />
                    </div>
                  </div>
                )}

                {selectedComponent === 'tooltip' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Tooltip Component</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline">Hover Me</Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This is a tooltip</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}

                {selectedComponent === 'table' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Table Component</h3>
                    <Table>
                      <TableCaption>A list of recent invoices</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>INV001</TableCell>
                          <TableCell>Paid</TableCell>
                          <TableCell>Credit Card</TableCell>
                          <TableCell className="text-right">$250.00</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>INV002</TableCell>
                          <TableCell>Pending</TableCell>
                          <TableCell>PayPal</TableCell>
                          <TableCell className="text-right">$125.00</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}

                {selectedComponent === 'dropdown-menu' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Dropdown Menu Component</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">Open Menu</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>Profile</DropdownMenuItem>
                        <DropdownMenuItem>Settings</DropdownMenuItem>
                        <DropdownMenuItem>Billing</DropdownMenuItem>
                        <DropdownMenuItem>Team</DropdownMenuItem>
                        <DropdownMenuItem>Subscription</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                {selectedComponent === 'form' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Form Component</h3>
                    <p className="text-muted-foreground mb-4">Form components with React Hook Form integration, validation, and accessibility.</p>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Comprehensive Form with Various Components</h4>
                        <div className="max-w-md">
                          <Form {...basicForm}>
                            <form onSubmit={basicForm.handleSubmit(onBasicSubmit)} className="space-y-4">
                              <FormField
                                control={basicForm.control}
                                name="email"
                                rules={{ 
                                  required: 'Email is required',
                                  pattern: {
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: 'Invalid email address'
                                  }
                                }}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                      <Input placeholder="example@example.com" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                      This is your email address.
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={basicForm.control}
                                name="password"
                                rules={{ 
                                  required: 'Password is required',
                                  minLength: {
                                    value: 6,
                                    message: 'Password must be at least 6 characters'
                                  }
                                }}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                      <Input type="password" placeholder="••••••••" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={basicForm.control}
                                name="role"
                                rules={{ required: 'Please select a role' }}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Role</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select your role" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="developer">Software Developer</SelectItem>
                                        <SelectItem value="designer">UI/UX Designer</SelectItem>
                                        <SelectItem value="manager">Project Manager</SelectItem>
                                        <SelectItem value="analyst">Business Analyst</SelectItem>
                                        <SelectItem value="tester">QA Tester</SelectItem>
                                        <SelectItem value="devops">DevOps Engineer</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormDescription>
                                      Choose your primary role
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={basicForm.control}
                                name="skills"
                                rules={{ required: 'Please select your primary skill' }}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Primary Technology Stack</FormLabel>
                                    <FormControl>
                                      <Combobox
                                        options={[
                                          { value: 'react', label: 'React' },
                                          { value: 'vue', label: 'Vue.js' },
                                          { value: 'angular', label: 'Angular' },
                                          { value: 'svelte', label: 'Svelte' },
                                          { value: 'next', label: 'Next.js' },
                                          { value: 'nuxt', label: 'Nuxt.js' },
                                          { value: 'typescript', label: 'TypeScript' },
                                          { value: 'javascript', label: 'JavaScript' },
                                          { value: 'python', label: 'Python' },
                                          { value: 'java', label: 'Java' },
                                          { value: 'csharp', label: 'C#' },
                                          { value: 'php', label: 'PHP' },
                                          { value: 'golang', label: 'Go' },
                                          { value: 'rust', label: 'Rust' },
                                          { value: 'kotlin', label: 'Kotlin' },
                                          { value: 'swift', label: 'Swift' }
                                        ]}
                                        placeholder="Select technology..."
                                        searchPlaceholder="Search technologies..."
                                        emptyText="No technology found."
                                        className="w-full"
                                        value={field.value}
                                        onValueChange={field.onChange}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Choose your primary technology stack
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={basicForm.control}
                                name="experience"
                                rules={{ required: 'Please select your experience level' }}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Experience Level</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select experience level" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="junior">Junior (0-2 years)</SelectItem>
                                        <SelectItem value="mid">Mid-level (2-5 years)</SelectItem>
                                        <SelectItem value="senior">Senior (5-8 years)</SelectItem>
                                        <SelectItem value="lead">Lead (8+ years)</SelectItem>
                                        <SelectItem value="principal">Principal (10+ years)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormDescription>
                                      Your years of experience
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={basicForm.control}
                                name="description"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>About You</FormLabel>
                                    <FormControl>
                                      <Textarea 
                                        placeholder="Tell us about yourself, your experience, and what you're passionate about..."
                                        className="min-h-[100px]"
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Optional: Share more about your background
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={basicForm.control}
                                name="notifications"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel>Email Notifications</FormLabel>
                                      <FormDescription>
                                        Receive updates about new features and opportunities
                                      </FormDescription>
                                    </div>
                                  </FormItem>
                                )}
                              />
                              <Button type="submit" className="w-full">Submit Application</Button>
                            </form>
                          </Form>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'calendar' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Calendar Component</h3>
                    <div className="max-w-sm">
                      <Calendar
                        mode="single"
                        selected={new Date()}
                        className="rounded-md border"
                      />
                    </div>
                  </div>
                )}

                {selectedComponent === 'alert' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Alert Component</h3>
                    <div className="space-y-4">
                      <Alert>
                        <AlertTitle>Information</AlertTitle>
                        <AlertDescription>
                          This is an informational alert message.
                        </AlertDescription>
                      </Alert>
                      <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                          Something went wrong. Please try again later.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                )}

                {selectedComponent === 'alert-dialog' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Alert Dialog Component</h3>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline">Open Alert Dialog</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your account
                            and remove your data from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}

                {selectedComponent === 'aspect-ratio' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Aspect Ratio Component</h3>
                    <div className="max-w-md">
                      <AspectRatio ratio={16 / 9} className="bg-muted overflow-hidden rounded-md">
                        <img
                          src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80"
                          alt="Example image"
                          className="object-cover w-full h-full"
                        />
                      </AspectRatio>
                      <p className="text-sm text-muted-foreground mt-2">16:9 aspect ratio</p>
                    </div>
                  </div>
                )}

                {selectedComponent === 'breadcrumb' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Breadcrumb Component</h3>
                    <Breadcrumb>
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/">Home</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/components">Components</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
                      </BreadcrumbItem>
                    </Breadcrumb>
                  </div>
                )}

                {selectedComponent === 'collapsible' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Collapsible Component</h3>
                    <Collapsible className="max-w-md space-y-2">
                      <div className="flex items-center justify-between space-x-4 px-4 py-2 border rounded-md">
                        <h4 className="text-sm font-semibold">Collapsible Title</h4>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">Toggle</Button>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent className="p-4 border rounded-md">
                        This content can be collapsed and expanded with the toggle button.
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}

                {selectedComponent === 'combobox' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Combobox Component</h3>
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Basic Combobox</h4>
                        <Combobox
                          options={[
                            { value: 'react', label: 'React' },
                            { value: 'vue', label: 'Vue.js' },
                            { value: 'angular', label: 'Angular' },
                            { value: 'svelte', label: 'Svelte' },
                            { value: 'solid', label: 'Solid.js' }
                          ]}
                          placeholder="Select framework..."
                          searchPlaceholder="Search framework..."
                          emptyText="No framework found."
                          className="w-[300px]"
                        />
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Combobox in Dialog</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Combobox inside a modal dialog (uses modal={false} to prevent focus conflicts).
                        </p>
                        <Dialog modal={false}>
                          <DialogTrigger asChild>
                            <Button variant="outline">Open Dialog with Combobox</Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Select Technology Stack</DialogTitle>
                              <DialogDescription>
                                Choose your preferred technology stack for the new project.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Frontend Framework</Label>
                                <Combobox
                                  options={[
                                    { value: 'react', label: 'React' },
                                    { value: 'vue', label: 'Vue.js' },
                                    { value: 'angular', label: 'Angular' },
                                    { value: 'svelte', label: 'Svelte' },
                                    { value: 'next', label: 'Next.js' },
                                    { value: 'nuxt', label: 'Nuxt.js' },
                                    { value: 'gatsby', label: 'Gatsby' },
                                    { value: 'remix', label: 'Remix' }
                                  ]}
                                  placeholder="Select frontend framework..."
                                  searchPlaceholder="Search frameworks..."
                                  emptyText="No framework found."
                                  className="w-full"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Backend Technology</Label>
                                <Combobox
                                  options={[
                                    { value: 'nodejs', label: 'Node.js' },
                                    { value: 'python', label: 'Python' },
                                    { value: 'java', label: 'Java' },
                                    { value: 'csharp', label: 'C#' },
                                    { value: 'golang', label: 'Go' },
                                    { value: 'rust', label: 'Rust' },
                                    { value: 'php', label: 'PHP' },
                                    { value: 'ruby', label: 'Ruby' }
                                  ]}
                                  placeholder="Select backend technology..."
                                  searchPlaceholder="Search technologies..."
                                  emptyText="No technology found."
                                  className="w-full"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Database</Label>
                                <Combobox
                                  options={[
                                    { value: 'postgresql', label: 'PostgreSQL' },
                                    { value: 'mysql', label: 'MySQL' },
                                    { value: 'mongodb', label: 'MongoDB' },
                                    { value: 'sqlite', label: 'SQLite' },
                                    { value: 'redis', label: 'Redis' },
                                    { value: 'firebase', label: 'Firebase' },
                                    { value: 'supabase', label: 'Supabase' }
                                  ]}
                                  placeholder="Select database..."
                                  searchPlaceholder="Search databases..."
                                  emptyText="No database found."
                                  className="w-full"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" onClick={() => toast("Configuration cancelled")}>
                                Cancel
                              </Button>
                              <Button onClick={() => toast.success("Technology stack saved!")}>
                                Save Configuration
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'command' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Command Component</h3>
                    <Command className="rounded-lg border shadow-md max-w-md">
                      <CommandInput placeholder="Type a command or search..." />
                      <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup heading="Suggestions">
                          <CommandItem>Calendar</CommandItem>
                          <CommandItem>Search</CommandItem>
                          <CommandItem>Settings</CommandItem>
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup heading="Recent">
                          <CommandItem>Documents</CommandItem>
                          <CommandItem>Projects</CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </div>
                )}

                {selectedComponent === 'context-menu' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Context Menu Component</h3>
                    <ContextMenu>
                      <ContextMenuTrigger className="flex h-40 w-full items-center justify-center rounded-md border border-dashed text-sm">
                        Right click here
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-64">
                        <ContextMenuItem>Cut</ContextMenuItem>
                        <ContextMenuItem>Copy</ContextMenuItem>
                        <ContextMenuItem>Paste</ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  </div>
                )}

                {selectedComponent === 'dialog' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Dialog Component</h3>
                    <p className="text-muted-foreground mb-4">Modal dialogs for user interaction and forms.</p>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Basic Dialog</h4>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline">Open Dialog</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Dialog Title</DialogTitle>
                              <DialogDescription>
                                This is a dialog example. Dialogs appear in front of app content to provide critical information or ask for decisions.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              Dialog content goes here.
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline">Cancel</Button>
                              <Button>Continue</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Dialog with Form</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Note: Uses modal={false} to prevent focus trapping conflicts with Combobox popover.
                        </p>
                        <Dialog modal={false}>
                          <DialogTrigger asChild>
                            <Button>Create New Task</Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Create New Task</DialogTitle>
                              <DialogDescription>
                                Fill out the form below to create a new task for your project.
                              </DialogDescription>
                            </DialogHeader>
                            <Form {...dialogForm}>
                              <form onSubmit={dialogForm.handleSubmit(onDialogSubmit)} className="space-y-4">
                                <FormField
                                  control={dialogForm.control}
                                  name="title"
                                  rules={{ required: 'Task title is required' }}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Task Title</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Enter task title..." {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={dialogForm.control}
                                  name="category"
                                  rules={{ required: 'Please select a category' }}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Category</FormLabel>
                                      <FormControl>
                                        <Combobox
                                          options={[
                                            { value: 'development', label: 'Development' },
                                            { value: 'design', label: 'Design' },
                                            { value: 'testing', label: 'Testing' },
                                            { value: 'documentation', label: 'Documentation' },
                                            { value: 'bug-fix', label: 'Bug Fix' },
                                            { value: 'feature', label: 'Feature' },
                                            { value: 'research', label: 'Research' },
                                            { value: 'deployment', label: 'Deployment' }
                                          ]}
                                          placeholder="Select category..."
                                          searchPlaceholder="Search categories..."
                                          emptyText="No category found."
                                          className="w-full"
                                          value={field.value}
                                          onValueChange={field.onChange}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={dialogForm.control}
                                  name="priority"
                                  rules={{ required: 'Please select a priority' }}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Priority</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select priority" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="low">Low</SelectItem>
                                          <SelectItem value="medium">Medium</SelectItem>
                                          <SelectItem value="high">High</SelectItem>
                                          <SelectItem value="critical">Critical</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={dialogForm.control}
                                  name="assignee"
                                  rules={{ required: 'Please select an assignee' }}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Assignee</FormLabel>
                                      <FormControl>
                                        <Combobox
                                          options={[
                                            { value: 'john-doe', label: 'John Doe' },
                                            { value: 'jane-smith', label: 'Jane Smith' },
                                            { value: 'mike-johnson', label: 'Mike Johnson' },
                                            { value: 'sarah-wilson', label: 'Sarah Wilson' },
                                            { value: 'david-brown', label: 'David Brown' },
                                            { value: 'lisa-garcia', label: 'Lisa Garcia' },
                                            { value: 'unassigned', label: 'Unassigned' }
                                          ]}
                                          placeholder="Select assignee..."
                                          searchPlaceholder="Search team members..."
                                          emptyText="No team member found."
                                          className="w-full"
                                          value={field.value}
                                          onValueChange={field.onChange}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={dialogForm.control}
                                  name="description"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Description</FormLabel>
                                      <FormControl>
                                        <Textarea 
                                          placeholder="Describe the task details..."
                                          className="min-h-[80px]"
                                          {...field} 
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        Optional: Add more details about the task
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={dialogForm.control}
                                  name="urgent"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                      <div className="space-y-1 leading-none">
                                        <FormLabel>Mark as urgent</FormLabel>
                                        <FormDescription>
                                          This task requires immediate attention
                                        </FormDescription>
                                      </div>
                                    </FormItem>
                                  )}
                                />
                                <div className="flex justify-end space-x-2 pt-4">
                                  <Button type="button" variant="outline" onClick={() => dialogForm.reset()}>
                                    Cancel
                                  </Button>
                                  <Button type="submit">Create Task</Button>
                                </div>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'hover-card' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Hover Card Component</h3>
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <Button variant="link">@username</Button>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80">
                        <div className="flex justify-between space-x-4">
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold">@username</h4>
                            <p className="text-sm">
                              User profile description with additional information.
                            </p>
                            <div className="flex items-center pt-2">
                              <span className="text-xs text-muted-foreground">
                                Joined December 2021
                              </span>
                            </div>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                )}

                {selectedComponent === 'menubar' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Menubar Component</h3>
                    <Menubar>
                      <MenubarMenu>
                        <MenubarTrigger>File</MenubarTrigger>
                        <MenubarContent>
                          <MenubarItem>New Tab</MenubarItem>
                          <MenubarItem>New Window</MenubarItem>
                          <MenubarItem disabled>Open File</MenubarItem>
                          <MenubarItem>Save</MenubarItem>
                        </MenubarContent>
                      </MenubarMenu>
                      <MenubarMenu>
                        <MenubarTrigger>Edit</MenubarTrigger>
                        <MenubarContent>
                          <MenubarItem>Undo</MenubarItem>
                          <MenubarItem>Redo</MenubarItem>
                          <MenubarItem>Cut</MenubarItem>
                          <MenubarItem>Copy</MenubarItem>
                          <MenubarItem>Paste</MenubarItem>
                        </MenubarContent>
                      </MenubarMenu>
                      <MenubarMenu>
                        <MenubarTrigger>View</MenubarTrigger>
                        <MenubarContent>
                          <MenubarItem>Zoom In</MenubarItem>
                          <MenubarItem>Zoom Out</MenubarItem>
                        </MenubarContent>
                      </MenubarMenu>
                    </Menubar>
                  </div>
                )}

                {selectedComponent === 'navigation-menu' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Navigation Menu Component</h3>
                    <NavigationMenu>
                      <NavigationMenuList>
                        <NavigationMenuItem>
                          <NavigationMenuTrigger>Getting Started</NavigationMenuTrigger>
                          <NavigationMenuContent>
                            <div className="p-4 space-y-2">
                              <h4 className="text-sm font-medium">Introduction</h4>
                              <p className="text-sm">Learn the basics and get started quickly.</p>
                            </div>
                          </NavigationMenuContent>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                          <NavigationMenuTrigger>Components</NavigationMenuTrigger>
                          <NavigationMenuContent>
                            <div className="p-4 space-y-2">
                              <h4 className="text-sm font-medium">UI Components</h4>
                              <p className="text-sm">All the components you need for your application.</p>
                            </div>
                          </NavigationMenuContent>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                          <NavigationMenuLink href="#" className="block p-2">
                            Documentation
                          </NavigationMenuLink>
                        </NavigationMenuItem>
                      </NavigationMenuList>
                    </NavigationMenu>
                  </div>
                )}

                {selectedComponent === 'pagination' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Pagination Component</h3>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious href="#" size="lg" />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#" size="lg">1</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#" isActive size="lg">2</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#" size="lg">3</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext href="#" size="lg" />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}

                {selectedComponent === 'popover' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Popover Component</h3>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline">Open Popover</Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-2">
                          <h4 className="font-medium">Popover Heading</h4>
                          <p className="text-sm">This is a popover component that appears when you click the trigger button.</p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {selectedComponent === 'scroll-area' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Scroll Area Component</h3>
                    <ScrollArea className="h-52 w-80 rounded-md border p-4">
                      <div>
                        <h4 className="mb-4 text-sm font-medium">Scrollable Content</h4>
                        {Array.from({ length: 20 }).map((_, i) => (
                          <div key={i} className="mb-4">
                            <p>Item {i + 1}</p>
                            <p className="text-sm text-muted-foreground">This is a scrollable area with custom scrollbar styling.</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {selectedComponent === 'separator' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Separator Component</h3>
                    <div className="space-y-4">
                      <p>This text is above the separator.</p>
                      <Separator />
                      <p>This text is below the separator.</p>
                      <div className="flex items-center">
                        <p>Left</p>
                        <Separator orientation="vertical" className="mx-4 h-6" />
                        <p>Right</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'sheet' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Sheet Component</h3>
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline">Open Sheet</Button>
                      </SheetTrigger>
                      <SheetContent>
                        <SheetHeader>
                          <SheetTitle>Edit Profile</SheetTitle>
                          <SheetDescription>
                            Make changes to your profile here. Click save when you're done.
                          </SheetDescription>
                        </SheetHeader>
                        <div className="py-4">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="name">Name</Label>
                              <Input id="name" placeholder="Enter your name" />
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                          <Button variant="outline">Cancel</Button>
                          <Button>Save changes</Button>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
                )}

                {selectedComponent === 'skeleton' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Skeleton Component</h3>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-3/4" />
                    </div>
                  </div>
                )}

                {selectedComponent === 'toggle' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Toggle Component</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Basic Toggles</h4>
                        <div className="flex flex-wrap gap-2">
                          <Toggle>Default</Toggle>
                          <Toggle variant="outline">Outline</Toggle>
                          <Toggle aria-pressed="true">Active</Toggle>
                          <Toggle disabled>Disabled</Toggle>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Toggles with Icons</h4>
                        <div className="flex flex-wrap gap-2">
                          <Toggle>
                            <Star size={16} />
                            Favorite
                          </Toggle>
                          <Toggle variant="outline">
                            <Bell size={16} />
                            Notifications
                          </Toggle>
                          <Toggle aria-pressed="true">
                            <Heart size={16} />
                            Like
                          </Toggle>
                          <Toggle>
                            <User size={16} />
                          </Toggle>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'toggle-group' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Toggle Group Component</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Basic Toggle Group</h4>
                        <ToggleGroup type="single" defaultValue="center">
                          <ToggleGroupItem value="left" aria-label="Align left">
                            Left
                          </ToggleGroupItem>
                          <ToggleGroupItem value="center" aria-label="Align center">
                            Center
                          </ToggleGroupItem>
                          <ToggleGroupItem value="right" aria-label="Align right">
                            Right
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Toggle Group with Icons</h4>
                        <ToggleGroup type="single" defaultValue="dashboard" variant="contained">
                          <ToggleGroupItem value="dashboard" aria-label="Dashboard">
                            <House size={16} />
                            Dashboard
                          </ToggleGroupItem>
                          <ToggleGroupItem value="analytics" aria-label="Analytics">
                            <Star size={16} />
                            Analytics
                          </ToggleGroupItem>
                          <ToggleGroupItem value="settings" aria-label="Settings">
                            <Gear size={16} />
                            Settings
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Icon-Only Toggle Group</h4>
                        <ToggleGroup type="single" defaultValue="heart" variant="outline">
                          <ToggleGroupItem value="star" aria-label="Star">
                            <Star size={16} />
                          </ToggleGroupItem>
                          <ToggleGroupItem value="heart" aria-label="Heart">
                            <Heart size={16} />
                          </ToggleGroupItem>
                          <ToggleGroupItem value="bell" aria-label="Bell">
                            <Bell size={16} />
                          </ToggleGroupItem>
                          <ToggleGroupItem value="user" aria-label="User">
                            <User size={16} />
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'action-button' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Action Button Component</h3>
                    <p className="text-muted-foreground mb-4">A standardized control for executing business actions.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Single Action</h4>
                        <ActionButton 
                          actions={[{ label: 'Create New', onSelect: () => console.log('Single action clicked') }]} 
                        />
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Multiple Actions</h4>
                        <ActionButton 
                          actions={sampleActions}
                          defaultLabel="Actions" 
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">With Primary Action</h4>
                        <ActionButton 
                          actions={sampleActions}
                          displayPrimaryAction={true}
                          defaultLabel="More Actions" 
                        />
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Different Positions</h4>
                        <div className="space-y-2">
                          <ActionButton 
                            actions={sampleActions}
                            displayPrimaryAction={true}
                            primaryActionPosition="right"
                            defaultLabel="Actions" 
                            className="mb-2"
                          />
                          <ActionButton 
                            actions={sampleActions}
                            displayPrimaryAction={true}
                            primaryActionPosition="top"
                            defaultLabel="Actions" 
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Variants</h4>
                        <div className="space-x-2">
                          <ActionButton 
                            actions={[{ label: 'Default', onSelect: () => {} }]} 
                            variant="default"
                          />
                          <ActionButton 
                            actions={[{ label: 'Outline', onSelect: () => {} }]} 
                            variant="outline"
                          />
                          <ActionButton 
                            actions={[{ label: 'Secondary', onSelect: () => {} }]} 
                            variant="secondary"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">States</h4>
                        <div className="space-x-2">
                          <ActionButton 
                            actions={[{ label: 'Loading', onSelect: () => {} }]} 
                            isLoading={true}
                          />
                          <ActionButton 
                            actions={[{ label: 'Disabled', onSelect: () => {} }]} 
                            isDisabled={true}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'icon' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Icon Component</h3>
                    <p className="text-muted-foreground mb-4">Universal icon component for Phosphor Icons with NWDS compliance.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Sizes</h4>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center">
                            <Icon icon={Star} size="xs" decorative={true} />
                            <span className="text-xs mt-1">xs</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Icon icon={Star} size="sm" decorative={true} />
                            <span className="text-xs mt-1">sm</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Icon icon={Star} size="md" decorative={true} />
                            <span className="text-xs mt-1">md</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Icon icon={Star} size="lg" decorative={true} />
                            <span className="text-xs mt-1">lg</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Icon icon={Star} size="xl" decorative={true} />
                            <span className="text-xs mt-1">xl</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Icon icon={Star} size="2xl" decorative={true} />
                            <span className="text-xs mt-1">2xl</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Variants</h4>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center">
                            <Icon icon={Star} variant="thin" decorative={true} />
                            <span className="text-xs mt-1">thin</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Icon icon={Star} variant="light" decorative={true} />
                            <span className="text-xs mt-1">light</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Icon icon={Star} variant="regular" decorative={true} />
                            <span className="text-xs mt-1">regular</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Icon icon={Star} variant="bold" decorative={true} />
                            <span className="text-xs mt-1">bold</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Icon icon={Star} variant="fill" decorative={true} />
                            <span className="text-xs mt-1">fill</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Icon icon={Star} variant="duotone" decorative={true} />
                            <span className="text-xs mt-1">duotone</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Semantic Icons</h4>
                        <div className="flex items-center gap-4">
                          <Icon icon={Heart} size="lg" variant="fill" label="Add to favorites" />
                          <Icon icon={Bell} size="lg" label="Notifications" />
                          <Icon icon={CircleWavyCheckIcon} size="lg" variant="duotone" label="Verified" />
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Custom Styling</h4>
                        <div className="flex items-center gap-4">
                          <Icon 
                            icon={Star} 
                            size="lg" 
                            variant="fill" 
                            decorative={true}
                            className="text-amber-400"
                          />
                          <Icon 
                            icon={Heart} 
                            size="lg" 
                            variant="fill" 
                            decorative={true}
                            className="text-rose-500"
                          />
                          <Icon 
                            icon={Bell} 
                            size="lg" 
                            variant="fill" 
                            decorative={true}
                            className="text-blue-500 hover:text-blue-600 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'simple-page' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Simple Page Layout</h3>
                    <p className="text-muted-foreground mb-4">A complete page layout with header, KPI cards, and content sections.</p>
                    
                    <div className="border rounded-lg overflow-hidden">
                      <PageLayout
                        headerTitle="Dashboard Overview"
                        headerDescription="Manage your organization's key metrics and performance indicators"
                        headerIcon={<House size={24} weight="bold" />}
                        headerSubViews={{
                          items: [
                            { value: 'overview', label: 'Overview', icon: <House size={16} /> },
                            { value: 'analytics', label: 'Analytics', icon: <Star size={16} /> },
                            { value: 'reports', label: 'Reports', icon: <Bell size={16} /> },
                            { value: 'settings', label: 'Settings', icon: <Gear size={16} /> }
                          ],
                          value: selectedSubView,
                          onValueChange: (value) => {
                            setSelectedSubView(value);
                            console.log('Sub-view changed to:', value);
                          }
                        }}
                        headerContent={
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Bell size={16} />
                              Notifications
                            </Button>
                            <Button size="sm">
                              <User size={16} />
                              Profile
                            </Button>
                          </div>
                        }
                        sectionTitle="Key Performance Indicators"
                        sectionDescription="Track your organization's most important metrics"
                        kpiCardsData={[
                          {
                            id: "revenue",
                            title: "Total Revenue",
                            value: "$124,500",
                            trend: {
                              value: "+12.5%",
                              positive: true,
                              description: "vs last month"
                            },
                            icon: "calendar"
                          },
                          {
                            id: "users",
                            title: "Active Users",
                            value: "2,847",
                            trend: {
                              value: "+3.2%",
                              positive: true,
                              description: "vs last month"
                            },
                            icon: "users"
                          },
                          {
                            id: "conversion",
                            title: "Conversion Rate",
                            value: "4.2%",
                            trend: {
                              value: "-0.8%",
                              positive: false,
                              description: "vs last month"
                            },
                            icon: "mail"
                          },
                          {
                            id: "leads",
                            title: "New Leads",
                            value: "89",
                            trend: {
                              value: "+15.3%",
                              positive: true,
                              description: "vs last month"
                            },
                            icon: "phone"
                          }
                        ]}
                        contentTitle={`${selectedSubView.charAt(0).toUpperCase() + selectedSubView.slice(1)} Content`}
                        className="min-h-[600px]"
                      >
                        <div className="space-y-4">
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-center mb-4">
                                <Badge variant="outline" className="text-sm">
                                  Currently viewing: {selectedSubView}
                                </Badge>
                              </div>
                              
                              {selectedSubView === 'overview' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-medium mb-2">Recent Actions</h4>
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 text-sm">
                                        <CircleWavyCheckIcon size={16} className="text-green-500" />
                                        <span>User account created</span>
                                        <span className="text-muted-foreground ml-auto">2 min ago</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm">
                                        <Star size={16} className="text-yellow-500" />
                                        <span>New review received</span>
                                        <span className="text-muted-foreground ml-auto">5 min ago</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm">
                                        <Bell size={16} className="text-blue-500" />
                                        <span>Notification sent</span>
                                        <span className="text-muted-foreground ml-auto">10 min ago</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-2">Quick Actions</h4>
                                    <div className="space-y-2">
                                      <Button size="sm" variant="outline" className="w-full justify-start">
                                        <User size={16} className="mr-2" />
                                        Manage Users
                                      </Button>
                                      <Button size="sm" variant="outline" className="w-full justify-start">
                                        <Gear size={16} className="mr-2" />
                                        Settings
                                      </Button>
                                      <Button size="sm" variant="outline" className="w-full justify-start">
                                        <Bell size={16} className="mr-2" />
                                        View Reports
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {selectedSubView === 'analytics' && (
                                <div className="text-center py-8">
                                  <h4 className="font-medium mb-2">Analytics Dashboard</h4>
                                  <p className="text-muted-foreground mb-4">View comprehensive analytics and insights</p>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 border rounded-lg">
                                      <h5 className="font-medium">Page Views</h5>
                                      <p className="text-2xl font-bold text-blue-600">12,345</p>
                                    </div>
                                    <div className="p-4 border rounded-lg">
                                      <h5 className="font-medium">Sessions</h5>
                                      <p className="text-2xl font-bold text-green-600">8,901</p>
                                    </div>
                                    <div className="p-4 border rounded-lg">
                                      <h5 className="font-medium">Bounce Rate</h5>
                                      <p className="text-2xl font-bold text-yellow-600">23.4%</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {selectedSubView === 'reports' && (
                                <div className="text-center py-8">
                                  <h4 className="font-medium mb-2">Reports Center</h4>
                                  <p className="text-muted-foreground mb-4">Generate and view detailed reports</p>
                                  <div className="space-y-2">
                                    <Button variant="outline" className="w-full justify-start">
                                      <Star size={16} className="mr-2" />
                                      Monthly Performance Report
                                    </Button>
                                    <Button variant="outline" className="w-full justify-start">
                                      <User size={16} className="mr-2" />
                                      User Activity Report
                                    </Button>
                                    <Button variant="outline" className="w-full justify-start">
                                      <Bell size={16} className="mr-2" />
                                      System Health Report
                                    </Button>
                                  </div>
                                </div>
                              )}
                              
                              {selectedSubView === 'settings' && (
                                <div className="text-center py-8">
                                  <h4 className="font-medium mb-2">Settings Panel</h4>
                                  <p className="text-muted-foreground mb-4">Configure your dashboard preferences</p>
                                  <div className="space-y-4 max-w-md mx-auto">
                                    <div className="flex items-center justify-between">
                                      <span>Email Notifications</span>
                                      <input type="checkbox" className="rounded" defaultChecked />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span>Dark Mode</span>
                                      <input type="checkbox" className="rounded" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span>Auto-refresh</span>
                                      <input type="checkbox" className="rounded" defaultChecked />
                                    </div>
                                    <Button size="sm" className="w-full">
                                      Save Settings
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                          
                          <div className="text-center text-muted-foreground text-sm">
                            This content changes based on the selected sub-view. 
                            Try switching between Overview, Analytics, Reports, and Settings!
                          </div>
                        </div>
                      </PageLayout>
                    </div>
                    
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Key Features Demonstrated:</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• <strong>subViews with Icons:</strong> Sub-navigation with icon + label support</li>
                        <li>• <strong>Responsive Navigation:</strong> Toggle group (desktop) → Dropdown (mobile)</li>
                        <li>• <strong>Header Section:</strong> Title, description, icon, and actions</li>
                        <li>• <strong>KPI Cards:</strong> Metrics display with change indicators</li>
                        <li>• <strong>Content Area:</strong> Dynamic content based on selected sub-view</li>
                        <li>• <strong>Deselection Prevention:</strong> Always maintains one selected item</li>
                      </ul>
                    </div>
                  </div>
                )}

                {selectedComponent === 'spinner' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Spinner Component</h3>
                    <p className="text-muted-foreground mb-4">Universal spinner component with semantic color variants.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Sizes</h4>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center">
                            <Spinner size="sm" />
                            <span className="text-xs mt-1">sm</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Spinner size="md" />
                            <span className="text-xs mt-1">md</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Spinner size="lg" />
                            <span className="text-xs mt-1">lg</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Spinner size="xl" />
                            <span className="text-xs mt-1">xl</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Variants</h4>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center">
                            <Spinner variant="default" />
                            <span className="text-xs mt-1">default</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Spinner variant="secondary" />
                            <span className="text-xs mt-1">secondary</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Spinner variant="destructive" />
                            <span className="text-xs mt-1">destructive</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Spinner variant="accent" />
                            <span className="text-xs mt-1">accent</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Spinner variant="muted" />
                            <span className="text-xs mt-1">muted</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">With Custom Labels</h4>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                          <Spinner size="lg" srText="Loading data..." />
                          <span className="text-xs mt-1">"Loading data..."</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <Spinner size="lg" variant="secondary" srText="Processing..." />
                          <span className="text-xs mt-1">"Processing..."</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'carousel' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Carousel Component</h3>
                    <p className="text-muted-foreground mb-4">A responsive carousel component for displaying multiple items.</p>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Basic Carousel</h4>
                        <div className="max-w-sm mx-auto">
                          <Carousel className="w-full">
                            <CarouselContent>
                              {Array.from({ length: 5 }).map((_, index) => (
                                <CarouselItem key={index}>
                                  <div className="p-1">
                                    <Card>
                                      <CardContent className="flex aspect-square items-center justify-center p-6">
                                        <span className="text-2xl font-semibold">{index + 1}</span>
                                      </CardContent>
                                    </Card>
                                  </div>
                                </CarouselItem>
                              ))}
                            </CarouselContent>
                            <CarouselPrevious />
                            <CarouselNext />
                          </Carousel>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Multiple Items</h4>
                        <div className="max-w-lg mx-auto">
                          <Carousel
                            opts={{
                              align: "start",
                            }}
                            className="w-full"
                          >
                            <CarouselContent>
                              {Array.from({ length: 10 }).map((_, index) => (
                                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                                  <div className="p-1">
                                    <Card>
                                      <CardContent className="flex aspect-square items-center justify-center p-6">
                                        <span className="text-xl font-semibold">{index + 1}</span>
                                      </CardContent>
                                    </Card>
                                  </div>
                                </CarouselItem>
                              ))}
                            </CarouselContent>
                            <CarouselPrevious />
                            <CarouselNext />
                          </Carousel>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'chart' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Chart Component</h3>
                    <p className="text-muted-foreground mb-4">Recharts-based chart components with consistent theming.</p>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Line Chart</h4>
                        <ChartContainer
                          config={{
                            desktop: {
                              label: "Desktop",
                              color: "hsl(var(--chart-1))",
                            },
                            mobile: {
                              label: "Mobile",
                              color: "hsl(var(--chart-2))",
                            },
                          }}
                          className="h-[300px]"
                        >
                          <LineChart
                            data={[
                              { month: "January", desktop: 186, mobile: 80 },
                              { month: "February", desktop: 305, mobile: 200 },
                              { month: "March", desktop: 237, mobile: 120 },
                              { month: "April", desktop: 73, mobile: 190 },
                              { month: "May", desktop: 209, mobile: 130 },
                              { month: "June", desktop: 214, mobile: 140 },
                            ]}
                            margin={{
                              left: 12,
                              right: 12,
                            }}
                          >
                            <CartesianGrid vertical={false} />
                            <XAxis
                              dataKey="month"
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                              tickFormatter={(value) => value.slice(0, 3)}
                            />
                            <ChartTooltip
                              cursor={false}
                              content={<ChartTooltipContent />}
                            />
                            <Line
                              dataKey="desktop"
                              type="monotone"
                              stroke="var(--color-desktop)"
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              dataKey="mobile"
                              type="monotone"
                              stroke="var(--color-mobile)"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ChartContainer>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Bar Chart</h4>
                        <ChartContainer
                          config={{
                            visitors: {
                              label: "Visitors",
                              color: "hsl(var(--chart-3))",
                            },
                          }}
                          className="h-[300px]"
                        >
                          <BarChart
                            data={[
                              { month: "January", visitors: 186 },
                              { month: "February", visitors: 305 },
                              { month: "March", visitors: 237 },
                              { month: "April", visitors: 73 },
                              { month: "May", visitors: 209 },
                              { month: "June", visitors: 214 },
                            ]}
                            margin={{
                              left: 12,
                              right: 12,
                            }}
                          >
                            <CartesianGrid vertical={false} />
                            <XAxis
                              dataKey="month"
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                              tickFormatter={(value) => value.slice(0, 3)}
                            />
                            <ChartTooltip
                              cursor={false}
                              content={<ChartTooltipContent />}
                            />
                            <Bar dataKey="visitors" fill="var(--color-visitors)" radius={8} />
                          </BarChart>
                        </ChartContainer>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'drawer' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Drawer Component</h3>
                    <p className="text-muted-foreground mb-4">A drawer component that slides in from the bottom on mobile devices.</p>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Basic Drawer</h4>
                        <Drawer>
                          <DrawerTrigger asChild>
                            <Button variant="outline">Open Drawer</Button>
                          </DrawerTrigger>
                          <DrawerContent>
                            <DrawerHeader>
                              <DrawerTitle>Edit Profile</DrawerTitle>
                              <DrawerDescription>
                                Make changes to your profile here. Click save when you're done.
                              </DrawerDescription>
                            </DrawerHeader>
                            <div className="p-4 pb-0">
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="name">Name</Label>
                                  <Input id="name" placeholder="Enter your name" />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="email">Email</Label>
                                  <Input id="email" type="email" placeholder="Enter your email" />
                                </div>
                              </div>
                            </div>
                            <DrawerFooter>
                              <Button>Save changes</Button>
                              <DrawerClose asChild>
                                <Button variant="outline">Cancel</Button>
                              </DrawerClose>
                            </DrawerFooter>
                          </DrawerContent>
                        </Drawer>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Simple Drawer</h4>
                        <Drawer>
                          <DrawerTrigger asChild>
                            <Button>Open Simple Drawer</Button>
                          </DrawerTrigger>
                          <DrawerContent>
                            <DrawerHeader>
                              <DrawerTitle>Simple Drawer</DrawerTitle>
                              <DrawerDescription>
                                This is a simple drawer with minimal content.
                              </DrawerDescription>
                            </DrawerHeader>
                            <div className="p-4 pb-0">
                              <p className="text-sm text-muted-foreground">
                                This drawer contains simple content and demonstrates the basic usage of the drawer component.
                              </p>
                            </div>
                            <DrawerFooter>
                              <DrawerClose asChild>
                                <Button variant="outline">Close</Button>
                              </DrawerClose>
                            </DrawerFooter>
                          </DrawerContent>
                        </Drawer>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'input-otp' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Input OTP Component</h3>
                    <p className="text-muted-foreground mb-4">An accessible one-time password input component.</p>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">6-Digit OTP</h4>
                        <div className="flex flex-col items-center space-y-2">
                          <InputOTP maxLength={6}>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                          <div className="text-center text-sm">
                            Enter your one-time password.
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">4-Digit PIN</h4>
                        <div className="flex flex-col items-center space-y-2">
                          <InputOTP maxLength={4}>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                            </InputOTPGroup>
                          </InputOTP>
                          <div className="text-center text-sm">
                            Enter your 4-digit PIN.
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Split Groups</h4>
                        <div className="flex flex-col items-center space-y-2">
                          <InputOTP maxLength={6}>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPGroup>
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                          <div className="text-center text-sm">
                            Two groups of 3 digits each.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'resizable' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Resizable Component</h3>
                    <p className="text-muted-foreground mb-4">Resizable panel components with draggable handles.</p>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Horizontal Panels</h4>
                        <ResizablePanelGroup
                          direction="horizontal"
                          className="max-w-md rounded-lg border"
                        >
                          <ResizablePanel defaultSize={50}>
                            <div className="flex h-[200px] items-center justify-center p-6">
                              <span className="font-semibold">Left Panel</span>
                            </div>
                          </ResizablePanel>
                          <ResizableHandle />
                          <ResizablePanel defaultSize={50}>
                            <div className="flex h-[200px] items-center justify-center p-6">
                              <span className="font-semibold">Right Panel</span>
                            </div>
                          </ResizablePanel>
                        </ResizablePanelGroup>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Vertical Panels</h4>
                        <ResizablePanelGroup
                          direction="vertical"
                          className="max-w-md rounded-lg border"
                        >
                          <ResizablePanel defaultSize={50}>
                            <div className="flex h-[100px] items-center justify-center p-6">
                              <span className="font-semibold">Top Panel</span>
                            </div>
                          </ResizablePanel>
                          <ResizableHandle />
                          <ResizablePanel defaultSize={50}>
                            <div className="flex h-[100px] items-center justify-center p-6">
                              <span className="font-semibold">Bottom Panel</span>
                            </div>
                          </ResizablePanel>
                        </ResizablePanelGroup>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Three Panels</h4>
                        <ResizablePanelGroup
                          direction="horizontal"
                          className="max-w-lg rounded-lg border"
                        >
                          <ResizablePanel defaultSize={25}>
                            <div className="flex h-[200px] items-center justify-center p-6">
                              <span className="font-semibold">Left</span>
                            </div>
                          </ResizablePanel>
                          <ResizableHandle />
                          <ResizablePanel defaultSize={50}>
                            <div className="flex h-[200px] items-center justify-center p-6">
                              <span className="font-semibold">Center</span>
                            </div>
                          </ResizablePanel>
                          <ResizableHandle />
                          <ResizablePanel defaultSize={25}>
                            <div className="flex h-[200px] items-center justify-center p-6">
                              <span className="font-semibold">Right</span>
                            </div>
                          </ResizablePanel>
                        </ResizablePanelGroup>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'sidebar' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Sidebar Component</h3>
                    <p className="text-muted-foreground mb-4">A composable sidebar component for navigation.</p>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Basic Sidebar</h4>
                        <div className="border rounded-lg overflow-hidden">
                          <SidebarProvider>
                            <div className="flex h-[400px] w-full max-w-2xl">
                              <Sidebar>
                                <SidebarHeader>
                                  <h2 className="text-lg font-semibold px-4 py-2">Navigation</h2>
                                </SidebarHeader>
                                <SidebarContent>
                                  <SidebarGroup>
                                    <SidebarGroupLabel>Main</SidebarGroupLabel>
                                    <SidebarGroupContent>
                                      <SidebarMenu>
                                        <SidebarMenuItem>
                                          <SidebarMenuButton>
                                            <House className="h-4 w-4" />
                                            <span>Home</span>
                                          </SidebarMenuButton>
                                        </SidebarMenuItem>
                                        <SidebarMenuItem>
                                          <SidebarMenuButton>
                                            <User className="h-4 w-4" />
                                            <span>Profile</span>
                                          </SidebarMenuButton>
                                        </SidebarMenuItem>
                                        <SidebarMenuItem>
                                          <SidebarMenuButton>
                                            <Gear className="h-4 w-4" />
                                            <span>Settings</span>
                                          </SidebarMenuButton>
                                        </SidebarMenuItem>
                                      </SidebarMenu>
                                    </SidebarGroupContent>
                                  </SidebarGroup>
                                  <SidebarGroup>
                                    <SidebarGroupLabel>Projects</SidebarGroupLabel>
                                    <SidebarGroupContent>
                                      <SidebarMenu>
                                        <SidebarMenuItem>
                                          <SidebarMenuButton>
                                            <span>Project A</span>
                                          </SidebarMenuButton>
                                        </SidebarMenuItem>
                                        <SidebarMenuItem>
                                          <SidebarMenuButton>
                                            <span>Project B</span>
                                          </SidebarMenuButton>
                                        </SidebarMenuItem>
                                      </SidebarMenu>
                                    </SidebarGroupContent>
                                  </SidebarGroup>
                                </SidebarContent>
                                <SidebarFooter>
                                  <div className="p-4 text-sm text-muted-foreground">
                                    v1.0.0
                                  </div>
                                </SidebarFooter>
                              </Sidebar>
                              <div className="flex-1 flex flex-col">
                                <div className="flex items-center gap-2 border-b p-4">
                                  <SidebarTrigger />
                                  <h1 className="font-semibold">Main Content</h1>
                                </div>
                                <div className="flex-1 p-4">
                                  <p className="text-sm text-muted-foreground">
                                    This is the main content area. Use the trigger button to toggle the sidebar.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </SidebarProvider>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'sonner' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Sonner Component</h3>
                    <p className="text-muted-foreground mb-4">Beautiful toast notifications with Sonner.</p>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Toast Types</h4>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            onClick={() => toast("Default toast message")}
                          >
                            Default Toast
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => toast.success("Success! Operation completed.")}
                          >
                            Success Toast
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => toast.error("Error! Something went wrong.")}
                          >
                            Error Toast
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => toast.warning("Warning! Please check your input.")}
                          >
                            Warning Toast
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Advanced Toasts</h4>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            onClick={() => toast.info("Info: This is an informational message.")}
                          >
                            Info Toast
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => toast.loading("Loading...")}
                          >
                            Loading Toast
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => toast("Custom toast with action", {
                              action: {
                                label: "Undo",
                                onClick: () => toast("Undo action triggered!"),
                              },
                            })}
                          >
                            Toast with Action
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Rich Content</h4>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            onClick={() => toast("Event has been created", {
                              description: "Today at 4:00 PM",
                              action: {
                                label: "Undo",
                                onClick: () => toast("Event deleted"),
                              },
                            })}
                          >
                            Rich Toast
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => toast.promise(
                              new Promise((resolve) => setTimeout(resolve, 2000)),
                              {
                                loading: "Saving...",
                                success: "Settings saved successfully!",
                                error: "Failed to save settings.",
                              }
                            )}
                          >
                            Promise Toast
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Toaster />
                  </div>
                )}

                {selectedComponent === 'card' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Card Component</h3>
                    <p className="text-muted-foreground mb-4">A flexible container component for displaying content with consistent styling.</p>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Basic Card</h4>
                        <div className="max-w-md">
                          <Card>
                            <CardHeader>
                              <CardTitle>Card Title</CardTitle>
                              <CardDescription>
                                This is a card description that provides context about the card content.
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm">
                                This is the main content area of the card. You can put any content here including forms, lists, or other components.
                              </p>
                            </CardContent>
                            <CardFooter>
                              <Button className="w-full">Action</Button>
                            </CardFooter>
                          </Card>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Card with Actions</h4>
                        <div className="max-w-md">
                          <Card>
                            <CardHeader>
                              <CardTitle>User Profile</CardTitle>
                              <CardDescription>
                                Manage your account settings and preferences
                              </CardDescription>
                              <CardAction>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <DotsThree className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem>Edit</DropdownMenuItem>
                                    <DropdownMenuItem>Share</DropdownMenuItem>
                                    <DropdownMenuItem>Delete</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </CardAction>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center space-x-4">
                                <Avatar>
                                  <AvatarImage src="https://github.com/shadcn.png" />
                                  <AvatarFallback>CN</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">John Doe</p>
                                  <p className="text-xs text-muted-foreground">john@example.com</p>
                                </div>
                              </div>
                            </CardContent>
                            <CardFooter>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">Cancel</Button>
                                <Button size="sm">Save Changes</Button>
                              </div>
                            </CardFooter>
                          </Card>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Stats Card</h4>
                        <div className="max-w-md">
                          <Card>
                            <CardHeader>
                              <CardTitle>Monthly Sales</CardTitle>
                              <CardDescription>
                                Revenue generated this month
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <div className="text-2xl font-bold">$12,345</div>
                                                                 <div className="flex items-center text-sm text-green-600">
                                   <TrendUp className="h-4 w-4 mr-1" />
                                   +12.5% from last month
                                 </div>
                                <Progress value={75} className="h-2" />
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Form Card</h4>
                        <div className="max-w-md">
                          <Card>
                            <CardHeader>
                              <CardTitle>Contact Form</CardTitle>
                              <CardDescription>
                                Send us a message and we'll get back to you
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="name">Name</Label>
                                  <Input id="name" placeholder="Your name" />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="email">Email</Label>
                                  <Input id="email" type="email" placeholder="your@email.com" />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="message">Message</Label>
                                  <Textarea id="message" placeholder="Your message here..." />
                                </div>
                              </div>
                            </CardContent>
                            <CardFooter>
                              <Button className="w-full">Send Message</Button>
                            </CardFooter>
                          </Card>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'select' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Select Component</h3>
                    <p className="text-muted-foreground mb-4">A dropdown selection component with search and keyboard navigation.</p>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Basic Select</h4>
                        <div className="max-w-sm space-y-4">
                          <div className="space-y-2">
                            <Label>Choose a framework</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a framework" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="react">React</SelectItem>
                                <SelectItem value="vue">Vue.js</SelectItem>
                                <SelectItem value="angular">Angular</SelectItem>
                                <SelectItem value="svelte">Svelte</SelectItem>
                                <SelectItem value="next">Next.js</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Select with Default Value</h4>
                        <div className="max-w-sm space-y-4">
                          <div className="space-y-2">
                            <Label>Priority Level</Label>
                            <Select defaultValue="medium">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low Priority</SelectItem>
                                <SelectItem value="medium">Medium Priority</SelectItem>
                                <SelectItem value="high">High Priority</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Multiple Selects</h4>
                        <div className="max-w-sm space-y-4">
                          <div className="space-y-2">
                            <Label>Country</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="us">United States</SelectItem>
                                <SelectItem value="uk">United Kingdom</SelectItem>
                                <SelectItem value="ca">Canada</SelectItem>
                                <SelectItem value="au">Australia</SelectItem>
                                <SelectItem value="de">Germany</SelectItem>
                                <SelectItem value="fr">France</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Language</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="es">Spanish</SelectItem>
                                <SelectItem value="fr">French</SelectItem>
                                <SelectItem value="de">German</SelectItem>
                                <SelectItem value="it">Italian</SelectItem>
                                <SelectItem value="pt">Portuguese</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Select with Icons</h4>
                        <div className="max-w-sm space-y-4">
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">
                                  <div className="flex items-center">
                                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                    Active
                                  </div>
                                </SelectItem>
                                <SelectItem value="pending">
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                                    Pending
                                  </div>
                                </SelectItem>
                                <SelectItem value="inactive">
                                  <div className="flex items-center">
                                    <X className="h-4 w-4 mr-2 text-red-500" />
                                    Inactive
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Form Example</h4>
                        <div className="max-w-sm space-y-4">
                          <Card>
                            <CardHeader>
                              <CardTitle>User Preferences</CardTitle>
                              <CardDescription>
                                Configure your account settings
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <Label>Theme</Label>
                                <Select defaultValue="system">
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="light">Light</SelectItem>
                                    <SelectItem value="dark">Dark</SelectItem>
                                    <SelectItem value="system">System</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Notifications</Label>
                                <Select defaultValue="all">
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Notifications</SelectItem>
                                    <SelectItem value="important">Important Only</SelectItem>
                                    <SelectItem value="none">None</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </CardContent>
                            <CardFooter>
                              <Button className="w-full">Save Preferences</Button>
                            </CardFooter>
                          </Card>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'data-table' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Data Table Component</h3>
                    <p className="text-muted-foreground mb-4">Advanced table component with sorting, filtering, pagination, and drag-and-drop functionality.</p>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Sample Data Table</h4>
                        <DataTable
                          dataSets={[
                            {
                              id: 'employees',
                              label: 'Employees',
                              data: [
                                { id: 1, name: 'John Doe', role: 'Developer', department: 'Engineering', salary: 75000, status: 'Active' },
                                { id: 2, name: 'Jane Smith', role: 'Designer', department: 'Design', salary: 65000, status: 'Active' },
                                { id: 3, name: 'Bob Johnson', role: 'Manager', department: 'Engineering', salary: 85000, status: 'Active' },
                                { id: 4, name: 'Alice Brown', role: 'Analyst', department: 'Finance', salary: 55000, status: 'Active' },
                                { id: 5, name: 'Charlie Wilson', role: 'Developer', department: 'Engineering', salary: 70000, status: 'Inactive' }
                              ],
                              columns: [
                                { id: 'name', accessorKey: 'name', header: 'Name' },
                                { id: 'role', accessorKey: 'role', header: 'Role' },
                                { id: 'department', accessorKey: 'department', header: 'Department' },
                                { id: 'salary', accessorKey: 'salary', header: 'Salary' },
                                { id: 'status', accessorKey: 'status', header: 'Status' }
                              ]
                            },
                            {
                              id: 'projects',
                              label: 'Projects',
                              data: [
                                { id: 1, name: 'Website Redesign', status: 'In Progress', priority: 'High', deadline: '2024-03-15' },
                                { id: 2, name: 'Mobile App', status: 'Planning', priority: 'Medium', deadline: '2024-06-01' },
                                { id: 3, name: 'API Integration', status: 'Completed', priority: 'Low', deadline: '2024-01-30' }
                              ],
                              columns: [
                                { id: 'name', accessorKey: 'name', header: 'Project Name' },
                                { id: 'status', accessorKey: 'status', header: 'Status' },
                                { id: 'priority', accessorKey: 'priority', header: 'Priority' },
                                { id: 'deadline', accessorKey: 'deadline', header: 'Deadline' }
                              ]
                            }
                          ]}
                          defaultDataSetId="employees"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'page-header' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Page Header Component</h3>
                    <p className="text-muted-foreground mb-4">Consistent page header with title, description, icon, sub-views, and actions.</p>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Basic Page Header</h4>
                        <div className="border rounded-lg p-4">
                          <PageHeader
                            title="Dashboard"
                            description="Overview of your organization's key metrics"
                            icon={<House className="h-5 w-5" />}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">With Actions</h4>
                        <div className="border rounded-lg p-4">
                          <PageHeader
                            title="Employee Management"
                            description="Manage your team members and their roles"
                            phosphorIcon={{
                              icon: Users,
                              variant: 'employee',
                              size: 'lg'
                            }}
                            primaryAction={
                              <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Employee
                              </Button>
                            }
                            secondaryActions={[
                              { label: 'Export Data', onClick: () => console.log('Export') },
                              { label: 'Import Data', onClick: () => console.log('Import') },
                              { label: 'Settings', onClick: () => console.log('Settings') }
                            ]}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">With Sub-Views</h4>
                        <div className="border rounded-lg p-4">
                          <PageHeader
                            title="Analytics"
                            description="View detailed analytics and reports"
                            phosphorIcon={{
                              icon: Target,
                              variant: 'strategy',
                              size: 'lg'
                            }}
                            subViews={{
                              items: [
                                { value: 'overview', label: 'Overview' },
                                { value: 'performance', label: 'Performance' },
                                { value: 'trends', label: 'Trends' },
                                { value: 'reports', label: 'Reports' }
                              ],
                              value: 'overview',
                              onValueChange: (value) => console.log('Sub-view changed:', value)
                            }}
                            actions={
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                  Export
                                </Button>
                                <Button size="sm">
                                  Generate Report
                                </Button>
                              </div>
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'section-kpi-cards' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Section KPI Cards Component</h3>
                    <p className="text-muted-foreground mb-4">Display key performance indicators with animated counting numbers.</p>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Sample KPI Cards</h4>
                        <SectionKpiCards
                          cards={[
                            {
                              id: 'total-employees',
                              title: 'Total Employees',
                              value: 1234,
                              icon: 'users',
                              iconColor: 'text-blue-500',
                              trend: {
                                value: '+12%',
                                positive: true,
                                description: 'from last month'
                              },
                              footer: 'Active employees across all departments'
                            },
                            {
                              id: 'revenue',
                              title: 'Monthly Revenue',
                              value: 125000,
                              prefix: '$',
                              decimalPlaces: 0,
                              iconColor: 'text-green-500',
                              trend: {
                                value: '+8.5%',
                                positive: true,
                                description: 'vs last month'
                              },
                              footer: 'Gross revenue for this month'
                            },
                            {
                              id: 'open-positions',
                              title: 'Open Positions',
                              value: 23,
                              iconColor: 'text-purple-500',
                              trend: {
                                value: '-5%',
                                positive: false,
                                description: 'positions filled'
                              },
                              footer: 'Currently hiring across teams'
                            },
                            {
                              id: 'satisfaction',
                              title: 'Employee Satisfaction',
                              value: 4.2,
                              suffix: '/5',
                              decimalPlaces: 1,
                              iconColor: 'text-yellow-500',
                              trend: {
                                value: '+0.3',
                                positive: true,
                                description: 'improvement'
                              },
                              footer: 'Based on latest survey'
                            }
                          ]}
                        />
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Simple KPI Cards</h4>
                        <SectionKpiCards
                          cards={[
                            {
                              id: 'projects',
                              title: 'Active Projects',
                              value: 42,
                              icon: 'calendar',
                              iconColor: 'text-indigo-500'
                            },
                            {
                              id: 'tasks',
                              title: 'Completed Tasks',
                              value: 187,
                              iconColor: 'text-green-500'
                            },
                            {
                              id: 'messages',
                              title: 'Unread Messages',
                              value: 12,
                              icon: 'mail',
                              iconColor: 'text-orange-500'
                            }
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'theme-switch' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Theme Switch Component</h3>
                    <p className="text-muted-foreground mb-4">Toggle between light and dark themes with visual indicators.</p>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Theme Toggle</h4>
                        <div className="flex items-center gap-4">
                          <ThemeSwitch />
                          <span className="text-sm text-muted-foreground">
                            Toggle between light and dark mode
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-6 p-4 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2">Features:</h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          <li>• <strong>Theme persistence</strong> - remembers user preference</li>
                          <li>• <strong>System preference detection</strong> - respects OS theme</li>
                          <li>• <strong>Smooth transitions</strong> - animated theme changes</li>
                          <li>• <strong>Accessibility</strong> - proper ARIA labels and keyboard support</li>
                          <li>• <strong>Visual indicators</strong> - sun/moon icons show current state</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComponent === 'icon-page-header' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Icon Page Header Component</h3>
                    <p className="text-muted-foreground mb-4">Specialized icon component for page headers with extensive variant support and consistent 1:1 aspect ratio.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Sizes</h4>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={Star} size="sm" />
                            <span className="text-xs mt-1">sm</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={Star} size="md" />
                            <span className="text-xs mt-1">md</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={Star} size="lg" />
                            <span className="text-xs mt-1">lg</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={Star} size="xl" />
                            <span className="text-xs mt-1">xl</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Basic Variants</h4>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={Star} variant="default" />
                            <span className="text-xs mt-1">default</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={CheckCircle} variant="success" />
                            <span className="text-xs mt-1">success</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={Warning} variant="warning" />
                            <span className="text-xs mt-1">warning</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={X} variant="destructive" />
                            <span className="text-xs mt-1">destructive</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">AI & Action Gradients</h4>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={MagicWand} variant="aiGenerated" />
                            <span className="text-xs mt-1">AI Generated</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={PaperPlaneRight} variant="aiModified" />
                            <span className="text-xs mt-1">AI Modified</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={Target} variant="action" />
                            <span className="text-xs mt-1">Action</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Status Variants</h4>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={Clock} variant="pending" />
                            <span className="text-xs mt-1">Pending</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={Play} variant="running" />
                            <span className="text-xs mt-1">Running</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={CheckCircle} variant="paid" />
                            <span className="text-xs mt-1">Paid</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={X} variant="overdue" />
                            <span className="text-xs mt-1">Overdue</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Entity Variants</h4>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={User} variant="employee" />
                            <span className="text-xs mt-1">Employee</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={Users} variant="department" />
                            <span className="text-xs mt-1">Department</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={FileText} variant="job" />
                            <span className="text-xs mt-1">Job</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={MapPin} variant="location" />
                            <span className="text-xs mt-1">Location</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">More Entity Types</h4>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={Cpu} variant="tech" />
                            <span className="text-xs mt-1">Tech</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={Target} variant="strategy" />
                            <span className="text-xs mt-1">Strategy</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={ShoppingCart} variant="order" />
                            <span className="text-xs mt-1">Order</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <IconPageHeader icon={Crown} variant="premium" />
                            <span className="text-xs mt-1">Premium</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Interactive Examples</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <IconPageHeader 
                              icon={FolderOpen} 
                              variant="default" 
                              size="lg" 
                              label="View project files" 
                              className="cursor-pointer hover:scale-105 transition-transform"
                            />
                            <span className="text-sm">Accessible with label</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <IconPageHeader 
                              icon={Shield} 
                              variant="success" 
                              size="lg" 
                              decorative={true}
                              className="cursor-pointer hover:scale-105 transition-transform"
                            />
                            <span className="text-sm">Decorative (no label)</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <IconPageHeader 
                              icon={Database} 
                              variant="tech" 
                              size="lg" 
                              label="Database status" 
                              className="cursor-pointer hover:scale-105 transition-transform"
                            />
                            <span className="text-sm">Entity-specific context</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Icon Variants</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <IconPageHeader 
                              icon={Star} 
                              iconVariant="thin" 
                              variant="default" 
                              size="lg" 
                              decorative={true}
                            />
                            <span className="text-sm">Thin weight</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <IconPageHeader 
                              icon={Star} 
                              iconVariant="bold" 
                              variant="default" 
                              size="lg" 
                              decorative={true}
                            />
                            <span className="text-sm">Bold weight</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <IconPageHeader 
                              icon={Star} 
                              iconVariant="fill" 
                              variant="default" 
                              size="lg" 
                              decorative={true}
                            />
                            <span className="text-sm">Fill style</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Key Features:</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• <strong>Consistent 1:1 aspect ratio</strong> with responsive sizing</li>
                        <li>• <strong>Extensive color variant system</strong> aligned with NEWWORK design tokens</li>
                        <li>• <strong>Gradient support</strong> for AI and action contexts</li>
                        <li>• <strong>Entity-specific variants</strong> for business context</li>
                        <li>• <strong>Performance optimized</strong> with opacity-based hover states</li>
                        <li>• <strong>Full accessibility support</strong> with proper ARIA attributes</li>
                        <li>• <strong>Icon weight variants</strong> for different visual contexts</li>
                      </ul>
                    </div>
                  </div>
                )}

                {selectedComponent !== 'button' && 
                 selectedComponent !== 'accordion' && 
                 selectedComponent !== 'input' &&
                 selectedComponent !== 'label' &&
                 selectedComponent !== 'checkbox' &&
                 selectedComponent !== 'radio-group' &&
                 selectedComponent !== 'switch' &&
                 selectedComponent !== 'textarea' &&
                 selectedComponent !== 'slider' &&
                 selectedComponent !== 'tabs' &&
                 selectedComponent !== 'avatar' &&
                 selectedComponent !== 'badge' &&
                 selectedComponent !== 'progress' &&
                 selectedComponent !== 'tooltip' &&
                 selectedComponent !== 'table' &&
                 selectedComponent !== 'dropdown-menu' &&
                 selectedComponent !== 'form' &&
                 selectedComponent !== 'calendar' &&
                 selectedComponent !== 'alert' &&
                 selectedComponent !== 'alert-dialog' &&
                 selectedComponent !== 'aspect-ratio' &&
                 selectedComponent !== 'breadcrumb' &&
                 selectedComponent !== 'collapsible' &&
                 selectedComponent !== 'command' &&
                 selectedComponent !== 'context-menu' &&
                 selectedComponent !== 'dialog' &&
                 selectedComponent !== 'hover-card' &&
                 selectedComponent !== 'menubar' &&
                 selectedComponent !== 'navigation-menu' &&
                 selectedComponent !== 'pagination' &&
                 selectedComponent !== 'popover' &&
                 selectedComponent !== 'scroll-area' &&
                 selectedComponent !== 'separator' &&
                 selectedComponent !== 'sheet' &&
                 selectedComponent !== 'skeleton' &&
                 selectedComponent !== 'toggle' &&
                 selectedComponent !== 'toggle-group' &&
                 selectedComponent !== 'action-button' &&
                 selectedComponent !== 'icon' &&
                 selectedComponent !== 'icon-page-header' &&
                 selectedComponent !== 'spinner' &&
                 selectedComponent !== 'carousel' &&
                 selectedComponent !== 'chart' &&
                 selectedComponent !== 'drawer' &&
                 selectedComponent !== 'input-otp' &&
                 selectedComponent !== 'resizable' &&
                 selectedComponent !== 'sidebar' &&
                 selectedComponent !== 'sonner' &&
                 selectedComponent !== 'simple-page' &&
                 selectedComponent !== 'data-table' &&
                 selectedComponent !== 'page-header' &&
                 selectedComponent !== 'section-kpi-cards' &&
                 selectedComponent !== 'theme-switch' &&
                 selectedComponent !== 'card' &&
                 selectedComponent !== 'select' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      {selectedComponent.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')} Component
                    </h3>
                    <p className="text-muted-foreground">
                      This component is available in the codebase but not yet configured for display in this showcase.
                      Select another component to view a working example.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ThemeProvider>
  )
}
export default Demo;
