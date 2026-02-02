import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Alert,
  AlertDescription,
  Badge
} from '@newwork/nw-design-system'
import { InfoIcon, CheckCircleIcon, WarningIcon } from '@phosphor-icons/react'

interface OverviewTabProps {
  moduleColor?: string
}

const OverviewTab: React.FC<OverviewTabProps> = () => {
  return (
    <div className="gba:space-y-6" data-testid="overview-tab">
      {/* Header */}
      <div>
        <h1 className="gba:text-3xl gba:font-bold gba:tracking-tight">Charts</h1>
        <p className="gba:text-muted-foreground gba:mt-2">
          Comprehensive chart examples built with NEWWORK design system and recharts.
        </p>
      </div>

      {/* Design System Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <InfoIcon className="gba:h-5 gba:w-5" />
            Design System Integration
          </CardTitle>
          <CardDescription>
            Our charts are built with @newwork/nw-design-system and follow specific patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:grid gba:gap-4 gba:md:grid-cols-2">
            <div>
              <h4 className="gba:font-semibold gba:mb-2">Required Components</h4>
              <ul className="gba:space-y-1 gba:text-sm">
                <li>
                  • <code className="gba:bg-muted gba:px-1 gba:rounded">ChartContainer</code> - Wrapper with config
                </li>
                <li>
                  • <code className="gba:bg-muted gba:px-1 gba:rounded">ChartTooltip</code> - Interactive tooltips
                </li>
                <li>
                  • <code className="gba:bg-muted gba:px-1 gba:rounded">ChartLegend</code> - Legend display
                </li>
                <li>
                  • <code className="gba:bg-muted gba:px-1 gba:rounded">Card</code> - Chart container
                </li>
                <li>
                  • <code className="gba:bg-muted gba:px-1 gba:rounded">IconAvatar</code> - Header icons
                </li>
              </ul>
            </div>
            <div>
              <h4 className="gba:font-semibold gba:mb-2">Chart Configuration</h4>
              <ul className="gba:space-y-1 gba:text-sm">
                <li>
                  • <code className="gba:bg-muted gba:px-1 gba:rounded">chartConfig</code> - Labels and metadata
                </li>
                <li>
                  • <code className="gba:bg-muted gba:px-1 gba:rounded">chartData</code> - Data structure
                </li>
                <li>
                  • <code className="gba:bg-muted gba:px-1 gba:rounded">moduleColor</code> - Theme integration
                </li>
                <li>
                  • <code className="gba:bg-muted gba:px-1 gba:rounded">data-testid</code> - Testing attributes
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color System */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <CheckCircleIcon className="gba:h-5 gba:w-5 gba:text-green-600" />
            Automatic Color Generation
          </CardTitle>
          <CardDescription>Our design system automatically generates colors for chart data</CardDescription>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <Alert>
            <InfoIcon className="gba:h-4 gba:w-4" />
            <AlertDescription>
              <strong>Preferred Approach:</strong> Let the design system automatically assign colors using CSS custom
              properties like <code>var(--color-keyname)</code> or <code>var(--chart-1)</code>.
            </AlertDescription>
          </Alert>

          <div className="gba:grid gba:gap-4 gba:md:grid-cols-2">
            <div>
              <h4 className="gba:font-semibold gba:mb-2 gba:flex gba:items-center gba:gap-2">
                <Badge variant="success">✓ Recommended</Badge>
                Automatic Colors
              </h4>
              <div className="gba:bg-muted gba:p-3 gba:rounded gba:text-sm">
                <pre>{`// Data with automatic colors
const chartData = [
  { 
    category: "web", 
    value: 275,
    fill: "var(--color-web)" 
  },
  { 
    category: "mobile", 
    value: 200,
    fill: "var(--color-mobile)" 
  }
];

// Config - data dimensions get color: "none"
const chartConfig = {
  value: { 
    label: "Value", 
    color: "none" // Used for dataKey only
  },
  web: { label: "Web" }, // Gets automatic color
  mobile: { label: "Mobile" } // Gets automatic color
};`}</pre>
              </div>
            </div>
            <div>
              <h4 className="gba:font-semibold gba:mb-2 gba:flex gba:items-center gba:gap-2">
                <Badge variant="warning">⚠ Semantic Only</Badge>
                Manual Colors
              </h4>
              <div className="gba:bg-muted gba:p-3 gba:rounded gba:text-sm">
                <pre>{`// Data with semantic colors
const chartData = [
  { 
    type: "positive", 
    value: 85,
    fill: "var(--color-positive)" 
  },
  { 
    type: "negative", 
    value: 15,
    fill: "var(--color-negative)" 
  }
];

// Config with manual semantic colors
const chartConfig = {
  value: { 
    label: "Value", 
    color: "none" // Used for dataKey only
  },
  positive: { 
    label: "Positive",
    color: "var(--nw-color-success)" 
  },
  negative: { 
    label: "Negative",
    color: "var(--nw-color-destructive)" 
  }
};`}</pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NameKey and LabelKey Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <InfoIcon className="gba:h-5 gba:w-5" />
            NameKey and LabelKey Patterns
          </CardTitle>
          <CardDescription>
            Understanding how to structure chart data and config for tooltips and legends
          </CardDescription>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <Alert>
            <InfoIcon className="gba:h-4 gba:w-4" />
            <AlertDescription>
              <strong>Key Rule:</strong> Data dimensions (used in dataKey/nameKey) should have{' '}
              <code>color: "none"</code> in chartConfig. Visual categories get automatic colors.
            </AlertDescription>
          </Alert>

          <div className="gba:bg-muted gba:p-3 gba:rounded gba:text-sm">
            <pre>{`// Pie/Radial Chart Example
const chartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" }
];

const chartConfig = {
  // Data dimension - used for dataKey/nameKey - no color needed
  visitors: { 
    label: "Visitors", 
    color: "none" // Used for sizing/tooltips only
  },
  // Visual categories - used for legend - get automatic colors
  chrome: { label: "Chrome" }, // Gets var(--color-chrome)
  safari: { label: "Safari" }   // Gets var(--color-safari)
};

// Usage in components
<ChartTooltipContent hideLabel nameKey="browser" />
<ChartLegendContent nameKey="browser" />
<Pie dataKey="visitors" nameKey="browser" />`}</pre>
          </div>
        </CardContent>
      </Card>

      {/* When to Use Semantic Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <WarningIcon className="gba:h-5 gba:w-5 gba:text-amber-600" />
            When to Use Semantic Colors
          </CardTitle>
          <CardDescription>Use specific colors only when they serve a meaningful purpose</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:gap-4 gba:md:grid-cols-2 gba:lg:grid-cols-4">
            <div>
              <Badge variant="destructive" className="gba:mb-2">
                Destructive
              </Badge>
              <p className="gba:text-sm gba:text-muted-foreground">
                Errors, failures, critical issues, negative values
              </p>
            </div>
            <div>
              <Badge variant="success" className="gba:mb-2">
                Success
              </Badge>
              <p className="gba:text-sm gba:text-muted-foreground">Completed tasks, achievements, positive outcomes</p>
            </div>
            <div>
              <Badge variant="warning" className="gba:mb-2">
                Warning
              </Badge>
              <p className="gba:text-sm gba:text-muted-foreground">Caution, pending states, moderate risk</p>
            </div>
            <div>
              <Badge variant="info" className="gba:mb-2">
                Info
              </Badge>
              <p className="gba:text-sm gba:text-muted-foreground">Informational content, neutral states</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle>Best Practices</CardTitle>
          <CardDescription>Guidelines for implementing charts in your applications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:gap-6 gba:md:grid-cols-2">
            <div>
              <h4 className="gba:font-semibold gba:mb-3 gba:text-green-700">✓ Do</h4>
              <ul className="gba:space-y-2 gba:text-sm">
                <li>
                  • Use <code>ChartContainer</code> for all charts
                </li>
                <li>• Include legends for multi-series charts</li>
                <li>• Add meaningful tooltips with proper formatting</li>
                <li>
                  • Use <code>moduleColor</code> for theme consistency
                </li>
                <li>
                  • Include <code>data-testid</code> attributes
                </li>
                <li>• Follow responsive design patterns</li>
                <li>• Use IconAvatar in card headers</li>
              </ul>
            </div>
            <div>
              <h4 className="gba:font-semibold gba:mb-3 gba:text-red-700">✗ Don't</h4>
              <ul className="gba:space-y-2 gba:text-sm">
                <li>• Hardcode colors unless semantic</li>
                <li>• Skip accessibility considerations</li>
                <li>• Use charts without proper labels</li>
                <li>• Ignore loading and error states</li>
                <li>• Mix different chart libraries</li>
                <li>• Forget to handle empty data states</li>
                <li>• Use overly complex visualizations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Template</CardTitle>
          <CardDescription>Basic template for creating a new chart component</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="gba:bg-muted gba:p-4 gba:rounded gba:text-sm gba:overflow-x-auto">
            <pre>{`import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  IconAvatar,
  ChartContainer,
  ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@newwork/nw-design-system';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { ChartBarIcon } from '@phosphor-icons/react';

const MyChart = ({ moduleColor, data }) => {
  const chartConfig = useMemo(() => ({
    value: { label: "Value" },
    category1: { label: "Category 1" },
    category2: { label: "Category 2" },
  }), []);

  return (
    <Card data-testid="my-chart">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar 
          icon={ChartBarIcon} 
          variant={moduleColor} 
          size="md" 
          decorative 
        />
        <div>
          <CardTitle>Chart Title</CardTitle>
          <CardDescription>Chart description</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer 
          config={chartConfig} 
          className="gba:h-[300px]"
        >
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="value" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};`}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default OverviewTab
