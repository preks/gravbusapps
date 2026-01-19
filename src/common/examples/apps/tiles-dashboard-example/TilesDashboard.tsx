import React from 'react'
import { TilesDashboard as TilesDashboardComponent } from '@newwork/nw-design-system'

// Define the Tile type locally since it's not exported from the design system
type TileType = 'text' | 'kpi' | 'chart' | 'table'

interface BaseTile {
  id: string
  title: string
  group?: string
  type: TileType
  createdAt: Date
  updatedAt: Date
}

interface TextTile extends BaseTile {
  type: 'text'
  content: string
}

interface KpiTile extends BaseTile {
  type: 'kpi'
  value: number
  unit?: string
  description?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: number
}

interface ChartData {
  [key: string]: string | number
}

interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area'
  data: ChartData[]
  xKey: string
  yKey: string
  title?: string
  height?: number
}

interface ChartTile extends BaseTile {
  type: 'chart'
  chartConfig: ChartConfig
}

interface TableTile extends BaseTile {
  type: 'table'
  data: Record<string, any>[]
  columns?: string[]
}

type Tile = TextTile | KpiTile | ChartTile | TableTile

export interface TilesDashboardProps {
  className?: string
}

// CRM-focused sample data
const crmDashboardTiles: Tile[] = [
  {
    id: 'crm_1',
    title: 'Sales Performance Overview',
    group: 'Sales Summary',
    type: 'text',
    content: `Q4 2024 Sales Summary

📈 **Key Achievements:**
• Revenue exceeded targets by 22%
• 450+ new customers acquired
• Average deal size increased by 18%
• Customer retention at 94.2%

🎯 **Upcoming Goals:**
• Expand into enterprise segment
• Launch new product line
• Improve lead conversion by 15%

⚠️ **Action Items:**
• Follow up on 23 pending deals
• Schedule Q1 territory planning
• Review pricing strategy for key accounts`,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'crm_2',
    title: 'Total Revenue',
    group: 'Key Metrics',
    type: 'kpi',
    value: 8750000,
    unit: '€',
    description: 'YTD Revenue 2024',
    trend: 'up',
    trendValue: 22.3,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'crm_3',
    title: 'Active Opportunities',
    group: 'Key Metrics',
    type: 'kpi',
    value: 127,
    description: 'In pipeline',
    trend: 'up',
    trendValue: 8.5,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'crm_4',
    title: 'Win Rate',
    group: 'Key Metrics',
    type: 'kpi',
    value: 68.5,
    unit: '%',
    description: 'Opportunity conversion',
    trend: 'up',
    trendValue: 5.2,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'crm_5',
    title: 'Customer Satisfaction',
    group: 'Key Metrics',
    type: 'kpi',
    value: 94.2,
    unit: '%',
    description: 'Net Promoter Score',
    trend: 'up',
    trendValue: 3.1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'crm_6',
    title: 'Monthly Sales Trend',
    group: 'Performance Analytics',
    type: 'chart',
    chartConfig: {
      type: 'line',
      data: [
        { month: 'Jul 2024', revenue: 650 },
        { month: 'Aug 2024', revenue: 720 },
        { month: 'Sep 2024', revenue: 680 },
        { month: 'Oct 2024', revenue: 820 },
        { month: 'Nov 2024', revenue: 950 },
        { month: 'Dec 2024', revenue: 1100 },
        { month: 'Jan 2025', revenue: 1250 }
      ],
      xKey: 'month',
      yKey: 'revenue',
      title: 'Monthly Revenue (K€)'
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'crm_7',
    title: 'Sales by Region',
    group: 'Performance Analytics',
    type: 'chart',
    chartConfig: {
      type: 'bar',
      data: [
        { region: 'DACH', revenue: 3200 },
        { region: 'UK & Ireland', revenue: 2100 },
        { region: 'Benelux', revenue: 1850 },
        { region: 'Nordics', revenue: 1600 }
      ],
      xKey: 'region',
      yKey: 'revenue',
      title: 'Revenue by Region (K€)'
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'crm_8',
    title: 'Lead Sources',
    group: 'Performance Analytics',
    type: 'chart',
    chartConfig: {
      type: 'pie',
      data: [
        { source: 'Website', percentage: 35 },
        { source: 'Referrals', percentage: 28 },
        { source: 'Trade Shows', percentage: 20 },
        { source: 'Cold Outreach', percentage: 12 },
        { source: 'Social Media', percentage: 5 }
      ],
      xKey: 'source',
      yKey: 'percentage',
      title: 'Lead Sources Distribution'
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'crm_9',
    title: 'Top Performing Sales Reps',
    group: 'Team Performance',
    type: 'table',
    data: [
      { name: 'Sarah Mitchell', deals: 23, revenue: 1250000, winRate: 78.3 },
      { name: 'David Chen', deals: 19, revenue: 980000, winRate: 71.2 },
      { name: 'Emma Rodriguez', deals: 21, revenue: 1150000, winRate: 69.8 },
      { name: 'Marcus Thompson', deals: 17, revenue: 850000, winRate: 65.4 },
      { name: 'Lisa Park', deals: 20, revenue: 1020000, winRate: 72.1 }
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'crm_10',
    title: 'Pipeline Health Check',
    group: 'Sales Pipeline',
    type: 'text',
    content: `Current Pipeline Status

🟢 **Healthy Indicators:**
• 127 active opportunities (€12.4M value)
• 34 deals in final negotiation stage
• Average deal velocity: 45 days
• Strong Q1 2025 forecast

🟡 **Areas for Attention:**
• 15 stalled deals requiring follow-up
• Lead qualification rate could improve
• Need more enterprise opportunities

📋 **Recommended Actions:**
• Schedule pipeline review meetings
• Increase prospecting activities
• Focus on enterprise lead generation`,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'crm_11',
    title: 'Average Deal Size',
    group: 'Sales Pipeline',
    type: 'kpi',
    value: 98500,
    unit: '€',
    description: 'This quarter',
    trend: 'up',
    trendValue: 18.2,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'crm_12',
    title: 'Customer Acquisition Cost',
    group: 'Sales Pipeline',
    type: 'kpi',
    value: 2850,
    unit: '€',
    description: 'Per customer',
    trend: 'down',
    trendValue: -8.5,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
]

const TilesDashboard: React.FC<TilesDashboardProps> = ({ className }) => {
  return (
    <div className={className}>
      <TilesDashboardComponent
        initialTiles={crmDashboardTiles}
        onTilesChange={tiles => {
          // In a real app, you would save the tiles to backend here
          console.log('Tiles updated:', tiles)
        }}
      />
    </div>
  )
}

export default TilesDashboard
export { TilesDashboard }
