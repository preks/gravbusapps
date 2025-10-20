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
import SimpleRadarChart from './SimpleRadarChart'
import MultipleRadarChart from './MultipleRadarChart'
import RadarChartDots from './RadarChartDots'
import RadarChartLegend from './RadarChartLegend'
import RadarChartLabel from './RadarChartLabel'
import RadarChartGrid from './RadarChartGrid'
import RadarChartLinesOnly from './RadarChartLinesOnly'
import RadarChartCustomLabel from './RadarChartCustomLabel'
import RadarChartGridFill from './RadarChartGridFill'
import RadarChartGridNone from './RadarChartGridNone'
import RadarChartGridCircle from './RadarChartGridCircle'
import RadarChartRadius from './RadarChartRadius'

// Import code examples
import {
  simpleRadarCode,
  multipleRadarCode,
  radarDotsCode,
  radarLegendCode,
  radarLabelCode,
  radarGridCode,
  radarChartLinesOnlyCode,
  radarChartCustomLabelCode,
  radarChartGridFillCode,
  radarChartGridNoneCode,
  radarChartGridCircleCode,
  radarChartRadiusCode
} from './code-examples'

interface RadarChartsTabProps {
  moduleColor?: string
}

interface ChartExample {
  id: string
  title: string
  description: string
  component: React.ComponentType<{ moduleColor?: string }>
  code: string
}

const RadarChartsTab: React.FC<RadarChartsTabProps> = ({ moduleColor }) => {
  const examples: ChartExample[] = [
    {
      id: 'simple',
      title: 'Radar Chart',
      description: 'A basic radar chart showing multi-dimensional data visualization.',
      component: SimpleRadarChart,
      code: simpleRadarCode
    },
    {
      id: 'multiple',
      title: 'Radar Chart - Multiple',
      description: 'A radar chart with multiple data series for comparison.',
      component: MultipleRadarChart,
      code: multipleRadarCode
    },
    {
      id: 'dots',
      title: 'Radar Chart - Dots',
      description: 'A radar chart with visible data points at each vertex.',
      component: RadarChartDots,
      code: radarDotsCode
    },
    {
      id: 'legend',
      title: 'Radar Chart - Legend',
      description: 'A radar chart with a legend showing data series and labels.',
      component: RadarChartLegend,
      code: radarLegendCode
    },
    {
      id: 'label',
      title: 'Radar Chart - Label',
      description: 'A radar chart with custom labels and axis configurations.',
      component: RadarChartLabel,
      code: radarLabelCode
    },
    {
      id: 'grid',
      title: 'Radar Chart - Grid',
      description: 'A radar chart with customized grid lines and styling.',
      component: RadarChartGrid,
      code: radarGridCode
    },
    {
      id: 'lines-only',
      title: 'Radar Chart - Lines Only',
      description: 'A radar chart displaying only line outlines without fill areas.',
      component: RadarChartLinesOnly,
      code: radarChartLinesOnlyCode
    },
    {
      id: 'custom-label',
      title: 'Radar Chart - Custom Label',
      description: 'A radar chart with custom positioned and styled axis labels.',
      component: RadarChartCustomLabel,
      code: radarChartCustomLabelCode
    },
    {
      id: 'grid-fill',
      title: 'Radar Chart - Grid Fill',
      description: 'A radar chart with filled grid background and enhanced styling.',
      component: RadarChartGridFill,
      code: radarChartGridFillCode
    },
    {
      id: 'grid-none',
      title: 'Radar Chart - Grid None',
      description: 'A radar chart without grid lines for a clean minimalist look.',
      component: RadarChartGridNone,
      code: radarChartGridNoneCode
    },
    {
      id: 'grid-circle',
      title: 'Radar Chart - Grid Circle',
      description: 'A radar chart with circular grid pattern instead of polygon.',
      component: RadarChartGridCircle,
      code: radarChartGridCircleCode
    },
    {
      id: 'radius',
      title: 'Radar Chart - Radius',
      description: 'A radar chart with custom radius axis positioning and formatting.',
      component: RadarChartRadius,
      code: radarChartRadiusCode
    }
  ]

  return (
    <div className="gba:space-y-6" data-testid="radar-charts-tab">
      {/* Header */}
      <div>
        <h1 className="gba:text-3xl gba:font-bold gba:tracking-tight">Radar Charts</h1>
        <p className="gba:text-muted-foreground gba:mt-2">
          Radar charts are ideal for visualizing multi-dimensional data, showing how different variables compare across
          multiple categories or dimensions.
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

export default RadarChartsTab
