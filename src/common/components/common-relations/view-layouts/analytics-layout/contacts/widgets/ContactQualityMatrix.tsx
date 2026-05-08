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
  ChartTooltipContent
} from '@newwork/nw-design-system'
import { BarChart, XAxis, YAxis, Bar } from 'recharts'
import { CheckCircleIcon } from '@phosphor-icons/react'

export interface ContactQualityData {
  fieldCompleteness: { field: string; completed: number; missing: number }[]
  accountCoverage: { category: string; count: number }[]
}

interface ContactQualityMatrixProps {
  data: ContactQualityData
  moduleColor?: string
}

export const ContactQualityMatrix: React.FC<ContactQualityMatrixProps> = ({ data, moduleColor = 'default' }) => {
  const fieldChartConfig = useMemo(
    () =>
      ({
        completed: {
          label: 'Completed'
        },
        missing: {
          label: 'Missing'
        }
      }) satisfies ChartConfig,
    []
  )

  const coverageChartConfig = useMemo(
    () =>
      ({
        count: {
          label: 'Contacts'
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
          <CardTitle>Contact Completeness Overview</CardTitle>
          <CardDescription>Backend aggregate counts for contact data completeness</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
          <div>
            <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Field Completeness</h4>
            <ChartContainer config={fieldChartConfig} className="gba:w-full gba:h-[260px]">
              <BarChart data={data.fieldCompleteness} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="field" type="category" width={120} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="completed" stackId="contacts" fill="var(--color-completed)" />
                <Bar dataKey="missing" stackId="contacts" fill="var(--color-missing)" />
              </BarChart>
            </ChartContainer>
          </div>
          <div>
            <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Account Coverage</h4>
            <ChartContainer config={coverageChartConfig} className="gba:w-full gba:h-[260px]">
              <BarChart data={data.accountCoverage} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="category" type="category" width={120} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ContactQualityMatrix
