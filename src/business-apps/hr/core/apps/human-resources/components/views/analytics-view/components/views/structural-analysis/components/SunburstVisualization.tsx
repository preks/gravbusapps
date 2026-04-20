import React from 'react'
import { SunburstChart, ResponsiveContainer, Tooltip } from 'recharts'
import { SunburstNode } from '../types/structuralTypes'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

interface SunburstVisualizationProps {
  data: SunburstNode
  prefixDataTestId?: string
}

// Custom tooltip component for sunburst
const SunburstTooltip: React.FC<any> = ({ active, payload }) => {
  const { t } = useTranslation(hrTranslations)
  if (active && payload && payload.length > 0) {
    const data = payload[0]?.payload

    // Add defensive checks to ensure data exists and has required properties
    if (!data || typeof data !== 'object') {
      return null
    }

    // Extract the original name by removing the ID suffix
    const displayName = data.name ? data.name.replace(/\s*\([^)]*\)$/, '') : t('hr-analytics-none')
    const value = data.value || 0
    const companyName = data.companyName

    return (
      <div className="gba:bg-card gba:border gba:border-border gba:rounded gba:p-2 gba:shadow-sm">
        <p className="gba:m-0 gba:font-bold gba:text-foreground">{displayName}</p>
        <p className="gba:m-0 gba:text-muted-foreground">
          {t('hr-analytics-employees')}: {value}
        </p>
        {companyName && (
          <p className="gba:m-0 gba:text-muted-foreground">
            {t('hr-analytics-company')}: {companyName}
          </p>
        )}
      </div>
    )
  }
  return null
}

// Transform hierarchical data to sunburst format with proper unique keys
const transformToSunburstFormat = (node: SunburstNode, index = 0): any => {
  // Create a unique name that includes the ID to prevent duplicates
  // Recharts uses the 'name' property as the key, so we need to make names unique
  const uniqueName = node.id ? `${node.name} (${node.id})` : `${node.name} (${index}-${node.level})`

  const uniqueId = node.id || `sunburst-${node.name.replace(/[^a-zA-Z0-9]/g, '_')}-${index}-level${node.level}`

  const result = {
    name: uniqueName, // Use unique name for Recharts key generation
    value: node.value,
    level: node.level,
    id: uniqueId, // Add unique ID for chart identification
    key: uniqueId, // Ensure unique key for React rendering
    fill: node.color || node.fill, // Preserve color information
    color: node.color, // Keep original color property
    children: node.children?.map((child, childIndex) => transformToSunburstFormat(child, childIndex)) || []
  }

  return result
}

// Add a fallback data generator for empty/invalid data
const createFallbackData = () => ({
  name: 'No Data',
  value: 0,
  level: 0,
  id: 'fallback-node',
  key: 'fallback-node',
  children: []
})

export const SunburstVisualization: React.FC<SunburstVisualizationProps> = ({
  data,
  prefixDataTestId = 'StructuralAnalysis'
}) => {
  const { t } = useTranslation(hrTranslations)
  // Enhanced data validation
  const hasValidData = data && typeof data === 'object' && data.name && typeof data.value === 'number' && data.value > 0

  // Transform data to match the working sunburst format with proper keys
  const sunburstData = hasValidData ? transformToSunburstFormat(data) : createFallbackData()

  return (
    <div data-testid={`${prefixDataTestId}-SunburstVisualization`} className="gba:grid gba:gap-6">
      <div>
        <h3 className="gba:m-0 gba:mb-4 gba:text-foreground gba:text-xl gba:font-semibold">
          {t('hr-analytics-organizational-hierarchy-sunburst')}
        </h3>
        <p className="gba:text-muted-foreground gba:text-sm">{t('hr-analytics-sunburst-description')}</p>
      </div>

      <div>
        {hasValidData ? (
          <ResponsiveContainer height={450} width="100%">
            <SunburstChart
              data={sunburstData}
              startAngle={0}
              endAngle={360}
              fill="var(--nw-color-chart-1)"
              innerRadius={10}
              ringPadding={1}
              stroke="var(--nw-color-primary-foreground)"
              textOptions={{
                fill: '#ffffff',
                fontSize: 12 as any,
                fontWeight: '600',
                paintOrder: 'stroke fill',
                stroke: 'rgba(0,0,0,0.7)',
                // Ensure labels don't block hover on sectors
                pointerEvents: 'none' as any
              }}
              dataKey="value"
            >
              <Tooltip
                content={<SunburstTooltip />}
                isAnimationActive={false}
                wrapperStyle={{ transition: 'none' }}
                allowEscapeViewBox={{ x: true, y: true }}
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                offset={0}
              />
            </SunburstChart>
          </ResponsiveContainer>
        ) : (
          <div className="gba:flex gba:flex-col gba:justify-center gba:items-center gba:h-96 gba:text-muted-foreground">
            <div className="gba:text-4xl gba:mb-4 gba:text-muted">📊</div>
            <div className="gba:text-lg gba:font-semibold gba:mb-2 gba:text-foreground">
              {t('hr-analytics-no-organizational-hierarchy-data')}
            </div>
            <div className="gba:text-sm gba:text-center gba:leading-6 gba:text-muted-foreground">
              {t('hr-analytics-data-empty-instruction')}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
