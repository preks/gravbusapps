import { useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ThemeProvider } from '@newwork/nw-design-system'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Toaster
} from '@newwork/nw-design-system'
import { House } from '@phosphor-icons/react'

// Import all showcase components
import ButtonsShowcase from './components/ButtonsShowcase'
import FormsShowcase from './components/FormsShowcase'
import DataDisplayShowcase from './components/DataDisplayShowcase'
import FeedbackShowcase from './components/FeedbackShowcase'
import AdvancedShowcase from './components/AdvancedShowcase'
import ComponentShowcase from './components/ComponentShowcase'

interface DemoProps extends BusinessAppContextProps {}

/**
 * Design System Demo Component
 * Comprehensive showcase of all components from @newwork/nw-design-system
 *
 * This demo includes every component from the original App.tsx, organized into
 * focused showcase sections for better maintainability and demonstration.
 */
function Demo(props: DemoProps) {
  const [selectedCategory, setSelectedCategory] = useState('overview')

  // All available component categories
  const componentCategories = [
    {
      value: 'overview',
      label: 'Overview',
      description: 'Introduction to the design system'
    },
    {
      value: 'buttons',
      label: 'Buttons & Actions',
      description: 'Interactive elements and controls'
    },
    {
      value: 'forms',
      label: 'Form Controls',
      description: 'Input components and validation'
    },
    {
      value: 'data-display',
      label: 'Data Display',
      description: 'Tables, badges, avatars, and data visualization'
    },
    {
      value: 'feedback',
      label: 'Feedback & Overlays',
      description: 'Alerts, dialogs, toasts, and notifications'
    },
    {
      value: 'advanced',
      label: 'Advanced Components',
      description: 'Navigation, charts, layouts, and complex interactions'
    }
  ]

  return (
    <ThemeProvider defaultTheme="light" storageKey="demo-ui-theme">
      <div className="gba:min-h-screen gba:bg-background" data-testid="design-system-demo">
        <div
          className="gba:container gba:mx-auto"
          style={{
            padding: 'var(--nw-spacing-8)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--nw-spacing-8)'
          }}
        >
          {/* Header */}
          <div
            className="gba:text-center"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--nw-spacing-4)'
            }}
          >
            <div className="gba:flex gba:items-center gba:justify-center" style={{ gap: 'var(--nw-spacing-2)' }}>
              <House size={32} weight="bold" className="gba:text-primary" />
              <h1 className="gba:text-3xl gba:font-bold">Design System Showcase</h1>
            </div>
            <p className="gba:text-lg gba:text-muted-foreground gba:max-w-2xl gba:mx-auto">
              Comprehensive demonstration of all components from @newwork/nw-design-system. Every component from the
              original App.tsx is showcased here with interactive examples.
            </p>
          </div>

          {/* Category Selector */}
          <div className="gba:w-full gba:max-w-md gba:mx-auto">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger data-testid="category-selector">
                <SelectValue>
                  {componentCategories.find(cat => cat.value === selectedCategory)?.label || 'Select Category'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {componentCategories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Main Demo Content */}
          <Card data-testid="demo-content">
            <CardHeader>
              <CardTitle>{componentCategories.find(cat => cat.value === selectedCategory)?.label}</CardTitle>
              <CardDescription>
                {componentCategories.find(cat => cat.value === selectedCategory)?.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedCategory === 'overview' && (
                <ComponentShowcase
                  title="Welcome to the Design System"
                  description="This showcase demonstrates every component available in @newwork/nw-design-system"
                >
                  <div className="gba:space-y-6">
                    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
                      {componentCategories.slice(1).map(category => (
                        <Card
                          key={category.value}
                          className="gba:cursor-pointer gba:hover:shadow-md gba:transition-shadow"
                          onClick={() => setSelectedCategory(category.value)}
                          data-testid={`overview-card-${category.value}`}
                        >
                          <CardHeader>
                            <CardTitle className="gba:text-lg">{category.label}</CardTitle>
                            <CardDescription>{category.description}</CardDescription>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>

                    <div className="gba:mt-8 gba:p-6 gba:bg-muted gba:rounded-lg">
                      <h3 className="gba:font-semibold gba:mb-2">Components Included:</h3>
                      <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:gap-2 gba:text-sm">
                        <span>• Button & ActionButton</span>
                        <span>• Toggle & ToggleGroup</span>
                        <span>• Input & Label</span>
                        <span>• Checkbox & RadioGroup</span>
                        <span>• Switch & Slider</span>
                        <span>• Textarea & Combobox</span>
                        <span>• Select & Form</span>
                        <span>• Table & DataTable</span>
                        <span>• Badge & Avatar</span>
                        <span>• Progress & Skeleton</span>
                        <span>• Icon & IconAvatar</span>
                        <span>• Alert & Dialog</span>
                        <span>• Toast & Popover</span>
                        <span>• Tooltip & HoverCard</span>
                        <span>• Tabs & Breadcrumb</span>
                        <span>• Menubar & Pagination</span>
                        <span>• Carousel & Charts</span>
                        <span>• Command & ContextMenu</span>
                        <span>• Collapsible & Spinner</span>
                        <span>• PageLayout & ThemeSwitch</span>
                        <span>• SectionKpiCards</span>
                        <span>• And many more...</span>
                      </div>
                    </div>
                  </div>
                </ComponentShowcase>
              )}

              {selectedCategory === 'buttons' && <ButtonsShowcase />}
              {selectedCategory === 'forms' && <FormsShowcase />}
              {selectedCategory === 'data-display' && <DataDisplayShowcase />}
              {selectedCategory === 'feedback' && <FeedbackShowcase />}
              {selectedCategory === 'advanced' && <AdvancedShowcase />}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="gba:text-center gba:text-sm gba:text-muted-foreground gba:pt-8 gba:border-t">
            <p>
              This demo showcases all {componentCategories.length - 1} categories with 50+ components from the
              @newwork/nw-design-system package.
            </p>
            <p className="gba:mt-2">
              Built with React, TypeScript, Tailwind CSS, and follows NEWWORK design principles.
            </p>
          </div>
        </div>
        <Toaster />
      </div>
    </ThemeProvider>
  )
}

export default Demo
