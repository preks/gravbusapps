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
import SimplePieChart from './SimplePieChart'
import PieChartLabel from './PieChartLabel'
import DonutChart from './DonutChart'
import DonutChartText from './DonutChartText'
import PieChartLegend from './PieChartLegend'
import InteractivePieChart from './InteractivePieChart'
import PieChartSeparatorNone from './PieChartSeparatorNone'
import PieChartCustomLabel from './PieChartCustomLabel'
import PieChartLabelList from './PieChartLabelList'
import DonutChartActive from './DonutChartActive'
import PieChartStacked from './PieChartStacked'

// Import code examples
import {
  simplePieCode,
  pieLabelCode,
  donutCode,
  donutTextCode,
  pieLegendCode,
  interactivePieCode,
  pieChartSeparatorNoneCode,
  pieChartCustomLabelCode,
  pieChartLabelListCode,
  donutChartActiveCode,
  pieChartStackedCode
} from './code-examples'

interface PieChartsTabProps {
  moduleColor?: string
}

interface ChartExample {
  id: string
  title: string
  description: string
  component: React.ComponentType<{ moduleColor?: string }>
  code: string
}

const PieChartsTab: React.FC<PieChartsTabProps> = ({ moduleColor }) => {
  const examples: ChartExample[] = [
    {
      id: 'simple',
      title: 'Pie Chart',
      description: 'A basic pie chart showing data distribution with automatic colors.',
      component: SimplePieChart,
      code: simplePieCode
    },
    {
      id: 'label',
      title: 'Pie Chart - Label',
      description: 'A pie chart with percentage labels displayed on each slice.',
      component: PieChartLabel,
      code: pieLabelCode
    },
    {
      id: 'donut',
      title: 'Donut Chart',
      description: 'A pie chart with a hollow center creating a donut effect.',
      component: DonutChart,
      code: donutCode
    },
    {
      id: 'donut-text',
      title: 'Donut Chart - Text',
      description: 'A donut chart with text displayed in the center.',
      component: DonutChartText,
      code: donutTextCode
    },
    {
      id: 'legend',
      title: 'Pie Chart - Legend',
      description: 'A pie chart with a legend showing data series and labels.',
      component: PieChartLegend,
      code: pieLegendCode
    },
    {
      id: 'interactive',
      title: 'Pie Chart - Interactive',
      description: 'An interactive pie chart with hover effects and animations.',
      component: InteractivePieChart,
      code: interactivePieCode
    },
    {
      id: 'separator-none',
      title: 'Pie Chart - Separator None',
      description: 'A pie chart with no separators between slices for a clean look.',
      component: PieChartSeparatorNone,
      code: pieChartSeparatorNoneCode
    },
    {
      id: 'custom-label',
      title: 'Pie Chart - Custom Label',
      description: 'A pie chart with custom positioned and formatted labels.',
      component: PieChartCustomLabel,
      code: pieChartCustomLabelCode
    },
    {
      id: 'label-list',
      title: 'Pie Chart - Label List',
      description: 'A pie chart with labels displayed using LabelList component.',
      component: PieChartLabelList,
      code: pieChartLabelListCode
    },
    {
      id: 'donut-active',
      title: 'Donut Chart - Active',
      description: 'A donut chart with active states and hover effects.',
      component: DonutChartActive,
      code: donutChartActiveCode
    },
    {
      id: 'stacked',
      title: 'Pie Chart - Stacked',
      description: 'A stacked pie chart with multiple data series in concentric circles.',
      component: PieChartStacked,
      code: pieChartStackedCode
    }
  ]

  return (
    <div className="gba:space-y-6" data-testid="pie-charts-tab">
      {/* Header */}
      <div>
        <h1 className="gba:text-3xl gba:font-bold gba:tracking-tight">Pie Charts</h1>
        <p className="gba:text-muted-foreground gba:mt-2">
          Pie charts show proportions and percentages of a whole. They are ideal for displaying categorical data where
          you want to show the relative sizes of different parts.
        </p>
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

export default PieChartsTab
