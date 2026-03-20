import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Spinner, useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

interface HiresAndDeparturesChartProps {
  hiresData: Array<{
    category: string
    dateCategory: string
    value: number
  }>
  exitsData: Array<{
    category: string
    dateCategory: string
    value: number
  }>
  netChangeData: Array<{
    category: string
    dateCategory: string
    value: number
  }>
  isLoading: boolean
  dataTestId: string
}

const HiresAndDeparturesChart: React.FC<HiresAndDeparturesChartProps> = ({
  hiresData,
  exitsData,
  netChangeData,
  isLoading,
  dataTestId
}) => {
  const { t } = useTranslation(hrTranslations)

  // Custom legend to enforce fixed order
  const renderLegend = (props: any) => {
    const desiredOrder = ['hires', 'departures', 'netChange']
    const items = Array.isArray(props?.payload) ? props.payload : []

    const ordered = [...items].sort((a, b) => {
      const ai = desiredOrder.indexOf(a?.dataKey ?? '')
      const bi = desiredOrder.indexOf(b?.dataKey ?? '')
      return ai - bi
    })

    const labelFor = (dataKey: string): string => {
      if (dataKey === 'hires') return t('hr-analytics-new-hires')
      if (dataKey === 'departures') return t('hr-analytics-departures')
      if (dataKey === 'netChange') return t('hr-analytics-net-change')
      return dataKey
    }

    return (
      <div className="gba:flex gba:flex-wrap gba:gap-4 gba:mb-2">
        {ordered.map((entry: any) => (
          <div key={entry.dataKey} className="gba:flex gba:items-center gba:gap-2">
            <span
              className="gba:inline-block gba:w-3 gba:h-3 gba:rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="gba:text-sm gba:text-foreground">{labelFor(entry.dataKey)}</span>
          </div>
        ))}
      </div>
    )
  }
  // Combine all data by date
  const combinedData = React.useMemo(() => {
    const dataMap = new Map()

    // Add hires data
    hiresData.forEach(item => {
      const date = new Date(item.dateCategory).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      })
      if (!dataMap.has(item.dateCategory)) {
        dataMap.set(item.dateCategory, { date, hires: 0, departures: 0, netChange: 0 })
      }
      dataMap.get(item.dateCategory).hires = item.value
    })

    // Add exits data
    exitsData.forEach(item => {
      const date = new Date(item.dateCategory).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      })
      if (!dataMap.has(item.dateCategory)) {
        dataMap.set(item.dateCategory, { date, hires: 0, departures: 0, netChange: 0 })
      }
      dataMap.get(item.dateCategory).departures = item.value
    })

    // Add net change data
    netChangeData.forEach(item => {
      const date = new Date(item.dateCategory).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      })
      if (!dataMap.has(item.dateCategory)) {
        dataMap.set(item.dateCategory, { date, hires: 0, departures: 0, netChange: 0 })
      }
      dataMap.get(item.dateCategory).netChange = item.value
    })

    // Convert to array and sort by date
    // Fix: ensure sort is stable and robust, handle potential invalid dates
    return Array.from(dataMap.entries())
      .sort(([a], [b]) => {
        const aTime = new Date(a).getTime()
        const bTime = new Date(b).getTime()
        if (isNaN(aTime) && isNaN(bTime)) return 0
        if (isNaN(aTime)) return 1
        if (isNaN(bTime)) return -1
        return aTime - bTime
      })
      .map(([, data]) => data)
  }, [hiresData, exitsData, netChangeData])

  if (isLoading) {
    return (
      <div data-testid={`${dataTestId}-loading`} className="gba:flex gba:justify-center gba:items-center gba:h-full">
        <Spinner className="gba:w-8 gba:h-8" />
      </div>
    )
  }

  if (combinedData.length === 0) {
    return (
      <div data-testid={`${dataTestId}-empty`} className="gba:flex gba:justify-center gba:items-center gba:h-full">
        <p className="gba:text-muted-foreground">{t('hr-analytics-no-hires-departures-data')}</p>
      </div>
    )
  }

  return (
    <div data-testid={dataTestId} className="gba:w-full gba:h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={combinedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--nw-muted)" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--nw-muted-foreground)" />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="var(--nw-muted-foreground)"
            label={{ value: t('hr-analytics-count'), angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            labelFormatter={value => `${t('hr-analytics-month')}: ${value}`}
            contentStyle={{
              backgroundColor: 'var(--nw-card)',
              border: '1px solid var(--nw-border)',
              borderRadius: '6px',
              boxShadow: 'var(--nw-shadow-sm)'
            }}
          />
          <Legend content={renderLegend} />
          <Line
            type="monotone"
            dataKey="hires"
            stroke="var(--nw-success)"
            strokeWidth={2}
            name={t('hr-analytics-new-hires')}
            dot={{ fill: 'var(--nw-success)', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, fill: 'var(--nw-success)' }}
          />
          <Line
            type="monotone"
            dataKey="departures"
            stroke="var(--nw-destructive)"
            strokeWidth={2}
            name={t('hr-analytics-departures')}
            dot={{ fill: 'var(--nw-destructive)', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, fill: 'var(--nw-destructive)' }}
          />
          <Line
            type="monotone"
            dataKey="netChange"
            stroke="var(--nw-chart-4)"
            strokeWidth={3}
            name={t('hr-analytics-net-change')}
            dot={{ fill: 'var(--nw-chart-4)', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: 'var(--nw-chart-4)' }}
            strokeDasharray="5 5"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default HiresAndDeparturesChart
