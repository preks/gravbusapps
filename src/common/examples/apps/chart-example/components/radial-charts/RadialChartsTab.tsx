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
import SimpleRadialChart from './SimpleRadialChart'
import RadialChartText from './RadialChartText'
import RadialChartLabel from './RadialChartLabel'
import RadialChartGrid from './RadialChartGrid'
import RadialChartStacked from './RadialChartStacked'
import RadialChartShape from './RadialChartShape'

// Import code examples
import {
  simpleRadialCode,
  radialTextCode,
  radialLabelCode,
  radialGridCode,
  radialStackedCode,
  radialShapeCode
} from './code-examples'

interface RadialChartsTabProps {
  moduleColor?: string
}

interface ChartExample {
  id: string
  title: string
  description: string
  component: React.ComponentType<{ moduleColor?: string }>
  code: string
}

const RadialChartsTab: React.FC<RadialChartsTabProps> = ({ moduleColor }) => {
  const examples: ChartExample[] = [
    {
      id: 'simple',
      title: 'Simple Radial Chart',
      description: 'A basic radial bar chart showing data in circular format.',
      component: SimpleRadialChart,
      code: simpleRadialCode
    },
    {
      id: 'text',
      title: 'Radial Chart with Text',
      description: 'A radial chart with text displayed in the center.',
      component: RadialChartText,
      code: radialTextCode
    },
    {
      id: 'label',
      title: 'Radial Chart with Labels',
      description: 'A radial chart with percentage labels on each segment.',
      component: RadialChartLabel,
      code: radialLabelCode
    },
    {
      id: 'grid',
      title: 'Radial Chart with Grid',
      description: 'A radial chart with customized grid lines and styling.',
      component: RadialChartGrid,
      code: radialGridCode
    },
    {
      id: 'stacked',
      title: 'Stacked Radial Chart',
      description: 'A radial chart with multiple stacked data series.',
      component: RadialChartStacked,
      code: radialStackedCode
    },
    {
      id: 'shape',
      title: 'Radial Chart with Shape',
      description: 'A radial chart with custom shapes and styling variations.',
      component: RadialChartShape,
      code: radialShapeCode
    }
  ]

  return (
    <div className="gba:space-y-6" data-testid="radial-charts-tab">
      {/* Header */}
      <div>
        <h1 className="gba:text-3xl gba:font-bold gba:tracking-tight">Radial Charts</h1>
        <p className="gba:text-muted-foreground gba:mt-2">
          Radial charts display data in a circular format, perfect for showing progress, completion rates, or
          hierarchical data with visual impact.
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

export default RadialChartsTab
