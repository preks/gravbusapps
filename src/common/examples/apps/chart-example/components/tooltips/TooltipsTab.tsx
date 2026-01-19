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

// Import tooltip examples
import DefaultTooltip from './DefaultTooltip'
import CustomTooltip from './CustomTooltip'
import AdvancedTooltip from './AdvancedTooltip'
import NoTooltip from './NoTooltip'
import InteractiveTooltip from './InteractiveTooltip'
import MultilineTooltip from './MultilineTooltip'

// Import code examples
import {
  defaultTooltipCode,
  customTooltipCode,
  advancedTooltipCode,
  noTooltipCode,
  interactiveTooltipCode,
  multilineTooltipCode
} from './code-examples'

interface TooltipsTabProps {
  moduleColor?: string
}

interface TooltipExample {
  id: string
  title: string
  description: string
  component: React.ComponentType<{ moduleColor?: string }>
  code: string
}

const TooltipsTab: React.FC<TooltipsTabProps> = ({ moduleColor }) => {
  const examples: TooltipExample[] = [
    {
      id: 'default',
      title: 'Default Tooltip',
      description: 'Standard tooltip with default styling and behavior.',
      component: DefaultTooltip,
      code: defaultTooltipCode
    },
    {
      id: 'custom',
      title: 'Custom Tooltip',
      description: 'Customized tooltip with enhanced styling and information.',
      component: CustomTooltip,
      code: customTooltipCode
    },
    {
      id: 'advanced',
      title: 'Advanced Tooltip',
      description: 'Advanced tooltip with multiple data series and formatting.',
      component: AdvancedTooltip,
      code: advancedTooltipCode
    },
    {
      id: 'none',
      title: 'No Tooltip',
      description: 'Chart with tooltips disabled for cleaner presentation.',
      component: NoTooltip,
      code: noTooltipCode
    },
    {
      id: 'interactive',
      title: 'Interactive Tooltip',
      description: 'Interactive tooltip with hover effects and animations.',
      component: InteractiveTooltip,
      code: interactiveTooltipCode
    },
    {
      id: 'multiline',
      title: 'Multiline Tooltip',
      description: 'Tooltip displaying multiple data points with labels.',
      component: MultilineTooltip,
      code: multilineTooltipCode
    }
  ]

  return (
    <div className="gba:space-y-6" data-testid="tooltips-tab">
      {/* Header */}
      <div>
        <h1 className="gba:text-3xl gba:font-bold gba:tracking-tight">Tooltips</h1>
        <p className="gba:text-muted-foreground gba:mt-2">
          Tooltips provide contextual information when users interact with chart elements. They can be customized to
          show specific data, formatted values, and multiple data series.
        </p>
      </div>

      {/* Examples Grid */}
      <div className="gba:grid gba:gap-6 gba:md:grid-cols-2">
        {examples.map(example => {
          const TooltipComponent = example.component
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
                          <div className="gba:mb-4">
                            <TooltipComponent moduleColor={moduleColor} />
                          </div>
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
                <TooltipComponent moduleColor={moduleColor} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TooltipsTab
