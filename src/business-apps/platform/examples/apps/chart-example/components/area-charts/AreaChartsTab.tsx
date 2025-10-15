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

// Import chart examples
import InteractiveAreaChart from './InteractiveAreaChart'
import SimpleAreaChart from './SimpleAreaChart'
import LinearAreaChart from './LinearAreaChart'
import StepAreaChart from './StepAreaChart'
import AreaChartLegend from './AreaChartLegend'
import StackedAreaChart from './StackedAreaChart'
import StackedExpandedAreaChart from './StackedExpandedAreaChart'
import AreaChartIcons from './AreaChartIcons'
import AreaChartGradient from './AreaChartGradient'
import AreaChartAxes from './AreaChartAxes'

// Import code examples
import {
  interactiveAreaCode,
  simpleAreaCode,
  linearAreaCode,
  stepAreaCode,
  areaLegendCode,
  stackedAreaCode,
  stackedExpandedAreaCode,
  areaIconsCode,
  areaGradientCode,
  areaAxesCode
} from './code-examples'

interface AreaChartsTabProps {
  moduleColor?: string
}

interface ChartExample {
  id: string
  title: string
  description: string
  component: React.ComponentType<{ moduleColor?: string }>
  code: string
}

const AreaChartsTab: React.FC<AreaChartsTabProps> = ({ moduleColor }) => {
  const examples: ChartExample[] = [
    {
      id: 'simple',
      title: 'Simple Area Chart',
      description: 'A simple area chart showing data trends over time.',
      component: SimpleAreaChart,
      code: simpleAreaCode
    },
    {
      id: 'linear',
      title: 'Area Chart - Linear',
      description: 'An area chart with linear interpolation between data points.',
      component: LinearAreaChart,
      code: linearAreaCode
    },
    {
      id: 'step',
      title: 'Area Chart - Step',
      description: 'An area chart with step-wise connections between data points.',
      component: StepAreaChart,
      code: stepAreaCode
    },
    {
      id: 'legend',
      title: 'Area Chart with Legend',
      description: 'An area chart with a legend to identify different data series.',
      component: AreaChartLegend,
      code: areaLegendCode
    },
    {
      id: 'stacked',
      title: 'Stacked Area Chart',
      description: 'An area chart with multiple data series stacked on top of each other.',
      component: StackedAreaChart,
      code: stackedAreaCode
    },
    {
      id: 'stacked-expanded',
      title: 'Area Chart - Stacked Expanded',
      description: 'A 100% stacked area chart showing proportions.',
      component: StackedExpandedAreaChart,
      code: stackedExpandedAreaCode
    },
    {
      id: 'icons',
      title: 'Area Chart with Icons',
      description: 'An area chart with custom icons in the legend.',
      component: AreaChartIcons,
      code: areaIconsCode
    },
    {
      id: 'gradient',
      title: 'Area Chart with Gradient',
      description: 'An area chart with gradient fills for visual appeal.',
      component: AreaChartGradient,
      code: areaGradientCode
    },
    {
      id: 'axes',
      title: 'Area Chart - Axes',
      description: 'An area chart with custom axis formatting and styling.',
      component: AreaChartAxes,
      code: areaAxesCode
    }
  ]

  return (
    <div className="gba:space-y-6" data-testid="area-charts-tab">
      {/* Header */}
      <div>
        <h1 className="gba:text-3xl gba:font-bold gba:tracking-tight">Area Charts</h1>
        <p className="gba:text-muted-foreground gba:mt-2">
          Area charts are used to display quantitative data graphically. They are particularly useful for showing trends
          over time and comparing multiple data series.
        </p>
      </div>

      {/* Featured Interactive Chart - Full Width */}
      <div className="gba:w-full gba:space-y-0">
        {/* Top slim card: Title, description, and code button */}
        <Card className="gba:py-3">
          <CardContent className="gba:py-0">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <h3 className="gba:font-semibold gba:text-base">Area Chart - Interactive</h3>
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                  Interactive area chart with data switching and totals display
                </p>
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
                    <SheetTitle>Area Chart - Interactive</SheetTitle>
                    <SheetDescription>Interactive area chart with data switching and totals display</SheetDescription>
                  </SheetHeader>
                  <div className="gba:mt-6">
                    <div className="gba:mb-4">
                      <InteractiveAreaChart moduleColor={moduleColor} />
                    </div>
                    <div className="gba:relative">
                      <pre className="gba:bg-muted gba:p-4 gba:rounded-lg gba:text-sm gba:overflow-auto gba:max-h-96">
                        <code>{interactiveAreaCode}</code>
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
          <InteractiveAreaChart moduleColor={moduleColor} />
        </div>
      </div>

      {/* Examples Grid */}
      <div className="gba:grid gba:gap-6 gba:md:grid-cols-2">
        {examples.map(example => {
          const ChartComponent = example.component
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
                            <ChartComponent moduleColor={moduleColor} />
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
                <ChartComponent moduleColor={moduleColor} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AreaChartsTab
