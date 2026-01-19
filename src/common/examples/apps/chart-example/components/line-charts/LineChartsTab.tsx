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
import InteractiveLineChart from './InteractiveLineChart'
import SimpleLineChart from './SimpleLineChart'
import MultipleLineChart from './MultipleLineChart'
import LineChartDots from './LineChartDots'
import StepLineChart from './StepLineChart'
import LinearLineChart from './LinearLineChart'
import CustomDotsLineChart from './CustomDotsLineChart'
import DotsColorsLineChart from './DotsColorsLineChart'
import LineChartLabel from './LineChartLabel'
import CustomLabelLineChart from './CustomLabelLineChart'

// Import code examples
import {
  interactiveLineCode,
  simpleLineCode,
  multipleLineCode,
  lineDotsCode,
  stepLineCode,
  linearLineCode,
  customDotsLineCode,
  dotsColorsLineCode,
  lineLabelCode,
  customLabelLineCode
} from './code-examples'

interface LineChartsTabProps {
  moduleColor?: string
}

interface ChartExample {
  id: string
  title: string
  description: string
  component: React.ComponentType<{ moduleColor?: string }>
  code: string
}

const LineChartsTab: React.FC<LineChartsTabProps> = ({ moduleColor }) => {
  const examples: ChartExample[] = [
    {
      id: 'simple',
      title: 'Line Chart',
      description: 'A basic line chart showing data trends over time.',
      component: SimpleLineChart,
      code: simpleLineCode
    },
    {
      id: 'multiple',
      title: 'Line Chart - Multiple',
      description: 'A line chart with multiple data series for comparison.',
      component: MultipleLineChart,
      code: multipleLineCode
    },
    {
      id: 'dots',
      title: 'Line Chart - Dots',
      description: 'A line chart with visible data points along the line.',
      component: LineChartDots,
      code: lineDotsCode
    },
    {
      id: 'custom-dots',
      title: 'Line Chart - Custom Dots',
      description: 'A line chart with custom styled data points and active states.',
      component: CustomDotsLineChart,
      code: customDotsLineCode
    },
    {
      id: 'dots-colors',
      title: 'Line Chart - Dots Colors',
      description: 'A line chart with colored dots and active state styling.',
      component: DotsColorsLineChart,
      code: dotsColorsLineCode
    },
    {
      id: 'step',
      title: 'Line Chart - Step',
      description: 'A line chart with step-wise connections between data points.',
      component: StepLineChart,
      code: stepLineCode
    },
    {
      id: 'linear',
      title: 'Line Chart - Linear',
      description: 'A line chart with linear interpolation and smooth curves.',
      component: LinearLineChart,
      code: linearLineCode
    },
    {
      id: 'label',
      title: 'Line Chart - Label',
      description: 'A line chart with data labels displayed above points.',
      component: LineChartLabel,
      code: lineLabelCode
    },
    {
      id: 'custom-label',
      title: 'Line Chart - Custom Label',
      description: 'A line chart with custom formatted labels and positioning.',
      component: CustomLabelLineChart,
      code: customLabelLineCode
    }
  ]

  return (
    <div className="gba:space-y-6" data-testid="line-charts-tab">
      {/* Header */}
      <div>
        <h1 className="gba:text-3xl gba:font-bold gba:tracking-tight">Line Charts</h1>
        <p className="gba:text-muted-foreground gba:mt-2">
          Line charts show trends and changes over time. They are perfect for displaying continuous data and identifying
          patterns, trends, and relationships.
        </p>
      </div>

      {/* Featured Interactive Chart - Full Width */}
      <div className="gba:w-full gba:space-y-0">
        {/* Top slim card: Title, description, and code button */}
        <Card className="gba:py-3">
          <CardContent className="gba:py-0">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <h3 className="gba:font-semibold gba:text-base">Line Chart - Interactive</h3>
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                  Interactive line chart with data switching and totals display
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
                    <SheetTitle>Line Chart - Interactive</SheetTitle>
                    <SheetDescription>Interactive line chart with data switching and totals display</SheetDescription>
                  </SheetHeader>
                  <div className="gba:mt-6">
                    <div className="gba:mb-4">
                      <InteractiveLineChart moduleColor={moduleColor} />
                    </div>
                    <div className="gba:relative">
                      <pre className="gba:bg-muted gba:p-4 gba:rounded-lg gba:text-sm gba:overflow-auto gba:max-h-96">
                        <code>{interactiveLineCode}</code>
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
          <InteractiveLineChart moduleColor={moduleColor} />
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

export default LineChartsTab
