import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  IconAvatar,
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { PieChart, Pie, BarChart, XAxis, YAxis, Bar } from 'recharts'
import { WarningCircleIcon, WarningIcon, InfoIcon } from '@phosphor-icons/react'
import { CheckCircleIcon } from '@phosphor-icons/react'

export interface ContactQualityData {
  overallScore: number
  qualityDistribution: { category: string; count: number; percentage: number }[]
  completenessMetrics: { metric: string; completed: number; total: number; percentage: number }[]
  issuesSummary: { missingEmails: number; missingPhones: number; missingAccounts: number; duplicatePotential: number }
}

interface ContactQualityMatrixProps {
  data: ContactQualityData
  moduleColor?: string
}

const toKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

export const ContactQualityMatrix: React.FC<ContactQualityMatrixProps> = ({ data, moduleColor = 'default' }) => {
  const pieChartConfig = useMemo(() => {
    if (!data.qualityDistribution || data.qualityDistribution.length === 0) return {} as ChartConfig
    const config: Record<string, { label?: string }> = {}
    data.qualityDistribution.forEach(item => {
      const key = toKey(item.category)
      config[key] = { label: item.category }
    })
    return config as ChartConfig
  }, [data.qualityDistribution])

  const pieChartData = useMemo(() => {
    if (!data.qualityDistribution || data.qualityDistribution.length === 0) return []
    return data.qualityDistribution.map(item => {
      const key = toKey(item.category)
      return {
        category: key,
        contacts: item.count,
        fill: `var(--color-${key})`
      }
    })
  }, [data.qualityDistribution])

  const barChartConfig = useMemo(
    () =>
      ({
        percentage: {
          label: 'Completeness %'
        }
      }) satisfies ChartConfig,
    []
  )
  return (
    <Card data-testid="contact-quality-matrix">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar
          icon={CheckCircleIcon}
          variant={moduleColor as any}
          size="md"
          iconWeight="regular"
          decorative={true}
        />
        <div>
          <CardTitle>Contact Quality Matrix</CardTitle>
          <CardDescription>Data quality analysis and completeness metrics</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:text-center gba:mb-6">
          <div className="gba:text-4xl gba:font-bold gba:text-primary gba:mb-2">{data.overallScore}%</div>
          <div className="gba:text-lg gba:text-muted-foreground">Overall Data Quality Score</div>
        </div>

        <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6 gba:mb-6">
          <div>
            <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Quality Distribution</h4>
            <ChartContainer
              config={pieChartConfig}
              className="[&_.recharts-pie-label-text]:fill-foreground gba:mx-auto gba:aspect-square gba:max-h-[200px] gba:pb-0"
            >
              <PieChart>
                <Pie data={pieChartData} cx="50%" cy="50%" outerRadius={75} dataKey="contacts" nameKey="category" />
                <ChartTooltip content={<ChartTooltipContent hideLabel labelKey="contacts" nameKey="category" />} />
                <ChartLegend
                  content={
                    <ChartLegendContent className="gba:-translate-y-2 gba:flex-wrap gba:gap-2 gba:*:basis-1/4 gba:*:justify-center" />
                  }
                />
              </PieChart>
            </ChartContainer>
          </div>
          <div>
            <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Data Completeness</h4>
            <ChartContainer config={barChartConfig} className="gba:w-full gba:h-[200px]">
              <BarChart data={data.completenessMetrics} layout="vertical">
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="metric" type="category" width={120} />
                <ChartTooltip content={<ChartTooltipContent formatter={v => [`${v}%`, 'Completeness']} />} />
                <Bar dataKey="percentage" fill="var(--color-percentage)" />
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        <div>
          <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Data Quality Issues</h4>
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-4 gba:gap-4">
            <div className="gba:p-4 gba:border gba:rounded-lg gba:bg-red-50 gba:border-red-200">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                <WarningCircleIcon size={16} className="gba:text-red-600" />
                <span className="gba:text-sm gba:font-medium gba:text-red-600">Missing Emails</span>
              </div>
              <div className="gba:text-2xl gba:font-bold gba:text-red-900">{data.issuesSummary.missingEmails}</div>
            </div>
            <div className="gba:p-4 gba:border gba:rounded-lg gba:bg-orange-50 gba:border-orange-200">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                <WarningIcon size={16} className="gba:text-orange-600" />
                <span className="gba:text-sm gba:font-medium gba:text-orange-600">Missing Phones</span>
              </div>
              <div className="gba:text-2xl gba:font-bold gba:text-orange-900">{data.issuesSummary.missingPhones}</div>
            </div>
            <div className="gba:p-4 gba:border gba:rounded-lg gba:bg-yellow-50 gba:border-yellow-200">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                <InfoIcon className="gba:text-yellow-600" />
                <span className="gba:text-sm gba:font-medium gba:text-yellow-600">Missing Accounts</span>
              </div>
              <div className="gba:text-2xl gba:font-bold gba:text-yellow-900">{data.issuesSummary.missingAccounts}</div>
            </div>
            <div className="gba:p-4 gba:border gba:rounded-lg gba:bg-purple-50 gba:border-purple-200">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                <WarningCircleIcon size={16} className="gba:text-purple-600" />
                <span className="gba:text-sm gba:font-medium gba:text-purple-600">Potential Duplicates</span>
              </div>
              <div className="gba:text-2xl gba:font-bold gba:text-purple-900">
                {data.issuesSummary.duplicatePotential}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ContactQualityMatrix
