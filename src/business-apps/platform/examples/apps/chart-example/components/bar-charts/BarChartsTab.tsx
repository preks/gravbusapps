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
import InteractiveBarChart from './InteractiveBarChart'
import SimpleBarChart from './SimpleBarChart'
import VerticalBarChart from './VerticalBarChart'
import MultipleBarChart from './MultipleBarChart'
import StackedBarChart from './StackedBarChart'
import BarChartLabel from './BarChartLabel'
import CustomLabelBarChart from './CustomLabelBarChart'
import MixedBarChart from './MixedBarChart'
import ActiveBarChart from './ActiveBarChart'
import NegativeBarChart from './NegativeBarChart'

// Import code examples
import {
  interactiveBarCode,
  simpleBarCode,
  verticalBarCode,
  multipleBarCode,
  stackedBarCode,
  barLabelCode,
  customLabelBarCode,
  mixedBarCode,
  activeBarCode,
  negativeBarCode
} from './code-examples'

interface BarChartsTabProps {
  moduleColor?: string
}

interface ChartExample {
  id: string
  title: string
  description: string
  component: React.ComponentType<{ moduleColor?: string }>
  code: string
}

const BarChartsTab: React.FC<BarChartsTabProps> = ({ moduleColor }) => {
  const examples: ChartExample[] = [
    {
      id: 'simple',
      title: 'Simple Bar Chart',
      description: 'A simple bar chart showing comparison between categories.',
      component: SimpleBarChart,
      code: simpleBarCode
    },
    {
      id: 'vertical',
      title: 'Bar Chart - Vertical',
      description: 'A vertical orientation bar chart with bars extending upward.',
      component: VerticalBarChart,
      code: verticalBarCode
    },
    {
      id: 'multiple',
      title: 'Multiple Bar Chart',
      description: 'A bar chart with multiple data series for comparison.',
      component: MultipleBarChart,
      code: multipleBarCode
    },
    {
      id: 'stacked',
      title: 'Stacked Bar Chart',
      description: 'A bar chart with stacked data series showing composition.',
      component: StackedBarChart,
      code: stackedBarCode
    },
    {
      id: 'label',
      title: 'Bar Chart with Labels',
      description: 'A bar chart displaying data labels on top of each bar.',
      component: BarChartLabel,
      code: barLabelCode
    },
    {
      id: 'custom-label',
      title: 'Bar Chart - Custom Label',
      description: 'A bar chart with custom formatted labels and positioning.',
      component: CustomLabelBarChart,
      code: customLabelBarCode
    },
    {
      id: 'mixed',
      title: 'Bar Chart - Mixed',
      description: 'A mixed chart combining bars and lines for different data types.',
      component: MixedBarChart,
      code: mixedBarCode
    },
    {
      id: 'active',
      title: 'Bar Chart - Active',
      description: 'A bar chart with hover effects and interactive highlighting.',
      component: ActiveBarChart,
      code: activeBarCode
    },
    {
      id: 'negative',
      title: 'Bar Chart - Negative',
      description: 'A bar chart handling both positive and negative values.',
      component: NegativeBarChart,
      code: negativeBarCode
    }
  ]

  return (
    <div className="gba:space-y-6" data-testid="bar-charts-tab">
      {/* Header */}
      <div>
        <h1 className="gba:text-3xl gba:font-bold gba:tracking-tight">Bar Charts</h1>
        <p className="gba:text-muted-foreground gba:mt-2">
          Bar charts are excellent for comparing values across categories. They are one of the most common and effective
          ways to visualize categorical data.
        </p>
      </div>

      {/* Featured Interactive Chart - Full Width */}
      <div className="gba:w-full gba:space-y-0">
        {/* Top slim card: Title, description, and code button */}
        <Card className="gba:py-3">
          <CardContent className="gba:py-0">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <h3 className="gba:font-semibold gba:text-base">Bar Chart - Interactive</h3>
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                  Interactive bar chart with data switching and totals display
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
                    <SheetTitle>Bar Chart - Interactive</SheetTitle>
                    <SheetDescription>Interactive bar chart with data switching and totals display</SheetDescription>
                  </SheetHeader>
                  <div className="gba:mt-6">
                    <div className="gba:mb-4">
                      <InteractiveBarChart moduleColor={moduleColor} />
                    </div>
                    <div className="gba:relative">
                      <pre className="gba:bg-muted gba:p-4 gba:rounded-lg gba:text-sm gba:overflow-auto gba:max-h-96">
                        <code>{interactiveBarCode}</code>
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
          <InteractiveBarChart moduleColor={moduleColor} />
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

export default BarChartsTab
