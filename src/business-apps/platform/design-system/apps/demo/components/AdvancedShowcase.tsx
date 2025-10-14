import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  Card,
  CardContent,
  Button,
  PageLayout,
  ThemeSwitch
} from '@newwork/nw-design-system'
import { LineChart, Line, XAxis, CartesianGrid, BarChart, Bar } from 'recharts'
import { House, Star, Gear, CaretDown } from '@phosphor-icons/react'
import ComponentShowcase from './ComponentShowcase'

/**
 * Showcase for advanced and complex components
 */
export function AdvancedShowcase() {
  const chartData = [
    { month: 'Jan', desktop: 186, mobile: 80 },
    { month: 'Feb', desktop: 305, mobile: 200 },
    { month: 'Mar', desktop: 237, mobile: 120 },
    { month: 'Apr', desktop: 73, mobile: 190 },
    { month: 'May', desktop: 209, mobile: 130 },
    { month: 'Jun', desktop: 214, mobile: 140 }
  ]

  return (
    <div className="gba:space-y-8" data-testid="advanced-showcase">
      {/* Navigation Components */}
      <ComponentShowcase title="Navigation Components" description="Tabs, menus, and navigation elements">
        <div className="gba:space-y-6">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Tabs</h4>
            <Tabs defaultValue="overview" data-testid="navigation-tabs">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="gba:p-4 gba:border gba:rounded-md gba:mt-2">
                <h5 className="gba:font-medium gba:mb-2">Overview Content</h5>
                <p className="gba:text-sm gba:text-muted-foreground">
                  This is the overview tab content. It shows general information and key metrics.
                </p>
              </TabsContent>
              <TabsContent value="analytics" className="gba:p-4 gba:border gba:rounded-md gba:mt-2">
                <h5 className="gba:font-medium gba:mb-2">Analytics Content</h5>
                <p className="gba:text-sm gba:text-muted-foreground">
                  Analytics and data insights are displayed here with charts and graphs.
                </p>
              </TabsContent>
              <TabsContent value="reports" className="gba:p-4 gba:border gba:rounded-md gba:mt-2">
                <h5 className="gba:font-medium gba:mb-2">Reports Content</h5>
                <p className="gba:text-sm gba:text-muted-foreground">
                  Generate and view various reports and documentation.
                </p>
              </TabsContent>
              <TabsContent value="settings" className="gba:p-4 gba:border gba:rounded-md gba:mt-2">
                <h5 className="gba:font-medium gba:mb-2">Settings Content</h5>
                <p className="gba:text-sm gba:text-muted-foreground">Configure application settings and preferences.</p>
              </TabsContent>
            </Tabs>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Breadcrumb</h4>
            <Breadcrumb data-testid="breadcrumb">
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Components</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Advanced</BreadcrumbPage>
              </BreadcrumbItem>
            </Breadcrumb>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Menubar</h4>
            <Menubar data-testid="menubar">
              <MenubarMenu>
                <MenubarTrigger>File</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem>New File</MenubarItem>
                  <MenubarItem>Open</MenubarItem>
                  <MenubarItem>Save</MenubarItem>
                  <MenubarItem>Export</MenubarItem>
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
                  <MenubarItem>Full Screen</MenubarItem>
                </MenubarContent>
              </MenubarMenu>
            </Menubar>
          </div>
        </div>
      </ComponentShowcase>

      {/* Pagination */}
      <ComponentShowcase title="Pagination" description="Navigation through paginated content">
        <Pagination data-testid="pagination">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">2</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">3</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">10</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </ComponentShowcase>

      {/* Carousel */}
      <ComponentShowcase title="Carousel" description="Scrollable content with navigation controls">
        <div className="gba:space-y-6">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Basic Carousel</h4>
            <div className="gba:max-w-xs gba:mx-auto">
              <Carousel data-testid="basic-carousel">
                <CarouselContent>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <CarouselItem key={index}>
                      <div className="gba:p-1">
                        <Card>
                          <CardContent className="gba:flex gba:aspect-square gba:items-center gba:justify-center gba:p-6">
                            <span className="gba:text-2xl gba:font-semibold">{index + 1}</span>
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
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Multiple Items Carousel</h4>
            <div className="gba:max-w-lg gba:mx-auto">
              <Carousel opts={{ align: 'start' }} data-testid="multi-carousel">
                <CarouselContent>
                  {Array.from({ length: 8 }).map((_, index) => (
                    <CarouselItem key={index} className="md:gba:basis-1/2 lg:gba:basis-1/3">
                      <div className="gba:p-1">
                        <Card>
                          <CardContent className="gba:flex gba:aspect-square gba:items-center gba:justify-center gba:p-6">
                            <span className="gba:text-lg gba:font-semibold">{index + 1}</span>
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
      </ComponentShowcase>

      {/* Charts */}
      <ComponentShowcase title="Chart Components" description="Data visualization with Recharts integration">
        <div className="gba:space-y-6">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Line Chart</h4>
            <ChartContainer
              config={{
                desktop: { label: 'Desktop', color: 'hsl(var(--nw-chart-1))' },
                mobile: { label: 'Mobile', color: 'hsl(var(--nw-chart-2))' }
              }}
              className="gba:h-[300px]"
              data-testid="line-chart"
            >
              <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Line dataKey="desktop" type="monotone" stroke="var(--nw-color-desktop)" strokeWidth={2} dot={false} />
                <Line dataKey="mobile" type="monotone" stroke="var(--nw-color-mobile)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Bar Chart</h4>
            <ChartContainer
              config={{
                visitors: { label: 'Visitors', color: 'hsl(var(--nw-chart-3))' }
              }}
              className="gba:h-[300px]"
              data-testid="bar-chart"
            >
              <BarChart data={chartData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="desktop" fill="var(--nw-color-visitors)" radius={8} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </ComponentShowcase>

      {/* Interactive Components */}
      <ComponentShowcase title="Interactive Components" description="Collapsible, command, and context menu components">
        <div className="gba:space-y-6">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Collapsible</h4>
            <Collapsible className="gba:max-w-md gba:space-y-2" data-testid="collapsible">
              <div className="gba:flex gba:items-center gba:justify-between gba:space-x-4 gba:px-4 gba:py-2 gba:border gba:rounded-md">
                <h4 className="gba:text-sm gba:font-semibold">Collapsible Section</h4>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <CaretDown className="gba:h-4 gba:w-4" />
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="gba:p-4 gba:border gba:rounded-md">
                <p className="gba:text-sm gba:text-muted-foreground">
                  This content can be collapsed and expanded using the toggle button above. It's useful for organizing
                  content and saving space.
                </p>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Command Palette</h4>
            <Command
              className="gba:rounded-lg gba:border gba:max-w-md"
              style={{ boxShadow: 'var(--nw-shadow-md)' }}
              data-testid="command"
            >
              <CommandInput placeholder="Type a command or search..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Suggestions">
                  <CommandItem>
                    <House className="gba:mr-2 gba:h-4 gba:w-4" />
                    <span>Dashboard</span>
                  </CommandItem>
                  <CommandItem>
                    <Star className="gba:mr-2 gba:h-4 gba:w-4" />
                    <span>Favorites</span>
                  </CommandItem>
                  <CommandItem>
                    <Gear className="gba:mr-2 gba:h-4 gba:w-4" />
                    <span>Settings</span>
                  </CommandItem>
                </CommandGroup>
                <CommandGroup heading="Recent">
                  <CommandItem>Projects</CommandItem>
                  <CommandItem>Documents</CommandItem>
                  <CommandItem>Reports</CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Context Menu</h4>
            <ContextMenu>
              <ContextMenuTrigger
                className="gba:flex gba:h-32 gba:w-full gba:items-center gba:justify-center gba:rounded-md gba:border gba:border-dashed gba:text-sm"
                data-testid="context-menu-trigger"
              >
                Right click here for context menu
              </ContextMenuTrigger>
              <ContextMenuContent className="gba:w-64">
                <ContextMenuItem>
                  <span>Cut</span>
                </ContextMenuItem>
                <ContextMenuItem>
                  <span>Copy</span>
                </ContextMenuItem>
                <ContextMenuItem>
                  <span>Paste</span>
                </ContextMenuItem>
                <ContextMenuItem>
                  <span>Delete</span>
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </div>
        </div>
      </ComponentShowcase>

      {/* Page Layout */}
      <ComponentShowcase
        title="Page Layout"
        description="Complete page layout with header, navigation, and content sections"
      >
        <div className="gba:border gba:rounded-lg gba:overflow-hidden">
          <PageLayout
            headerTitle="Layout Example"
            headerDescription="Demonstration of the complete page layout component"
            headerIcon={<House size={20} />}
            headerSubViews={{
              items: [
                { value: 'home', label: 'Home', icon: <House size={16} /> },
                {
                  value: 'analytics',
                  label: 'Analytics',
                  icon: <Star size={16} />
                },
                {
                  value: 'settings',
                  label: 'Settings',
                  icon: <Gear size={16} />
                }
              ],
              value: 'home',
              onValueChange: () => {}
            }}
            headerContent={<ThemeSwitch />}
            sectionTitle="Content Section"
            sectionDescription="This demonstrates how content is organized within the layout"
            className="gba:min-h-[400px]"
            data-testid="page-layout"
          >
            <div className="gba:p-6 gba:text-center">
              <p className="gba:text-muted-foreground">
                This is the main content area of the page layout. It can contain any components or content you need for
                your application.
              </p>
            </div>
          </PageLayout>
        </div>
      </ComponentShowcase>
    </div>
  )
}

export default AdvancedShowcase
