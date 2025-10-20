import React from 'react'
import {
  Card,
  CardContent,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@newwork/nw-design-system'
import { CodeIcon } from '@phosphor-icons/react'

// Import layout examples
import GridLayoutExample from './GridLayoutExample'
import ResponsiveLayoutExample from './ResponsiveLayoutExample'
import DashboardLayoutExample from './DashboardLayoutExample'

// Import code examples
import { gridLayoutCode, responsiveLayoutCode, dashboardLayoutCode } from './code-examples'

interface LayoutTabProps {
  moduleColor?: string
}

interface LayoutExample {
  id: string
  title: string
  description: string
  component: React.ComponentType<{ moduleColor?: string }>
  code: string
}

const LayoutTab: React.FC<LayoutTabProps> = ({ moduleColor }) => {
  const examples: LayoutExample[] = [
    {
      id: 'grid',
      title: 'Grid Layout',
      description: 'Multiple charts arranged in a responsive grid layout, perfect for dashboards.',
      component: GridLayoutExample,
      code: gridLayoutCode
    },
    {
      id: 'responsive',
      title: 'Responsive Layout',
      description: 'Charts that adapt to different screen sizes with responsive breakpoints.',
      component: ResponsiveLayoutExample,
      code: responsiveLayoutCode
    },
    {
      id: 'dashboard',
      title: 'Dashboard Layout',
      description: 'Complete dashboard layout with mixed chart types and sizes.',
      component: DashboardLayoutExample,
      code: dashboardLayoutCode
    }
  ]

  return (
    <div className="gba:space-y-6" data-testid="layout-tab">
      {/* Header */}
      <div>
        <h1 className="gba:text-3xl gba:font-bold gba:tracking-tight">Layout Examples</h1>
        <p className="gba:text-muted-foreground gba:mt-2">
          These examples demonstrate how to arrange multiple charts in responsive layouts for dashboards and analytics
          views.
        </p>
      </div>

      {/* Layout Examples */}
      <div className="gba:space-y-8">
        {examples.map(example => {
          const LayoutComponent = example.component
          return (
            <div key={example.id} className="gba:space-y-0">
              {/* Top slim card: Title, description, and code button */}
              <Card className="gba:py-3">
                <CardContent className="gba:py-0">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <div>
                      <h3 className="gba:font-semibold gba:text-base">{example.title}</h3>
                      <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{example.description}</p>
                    </div>
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="sm">
                          <CodeIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                          Code
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="gba:w-[600px] gba:sm:gba:w-[800px]">
                        <SheetHeader>
                          <SheetTitle>{example.title}</SheetTitle>
                          <SheetDescription>{example.description}</SheetDescription>
                        </SheetHeader>
                        <div className="gba:mt-6">
                          <div className="gba:relative">
                            <pre className="gba:bg-muted gba:p-4 gba:rounded-lg gba:text-sm gba:overflow-auto gba:max-h-96">
                              <code>{example.code}</code>
                            </pre>
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
                </CardContent>
              </Card>

              {/* Bottom card: Chart only */}
              <div>
                <LayoutComponent moduleColor={moduleColor} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default LayoutTab
