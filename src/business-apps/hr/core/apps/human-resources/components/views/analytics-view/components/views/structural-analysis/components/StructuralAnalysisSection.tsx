import type { ReactNode } from 'react'
import {
  SectionKpiCards,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  type KpiCardData
} from '@newwork/nw-design-system'
import { STRUCTURAL_ANALYSIS_CHART_SURFACE_CLASS } from '../../../shared/analyticsChartSurfaceStyles'

interface StructuralAnalysisSectionProps {
  title: string
  children: ReactNode
  description?: string
  icon?: ReactNode
}

interface StructuralAnalysisKpiSectionProps {
  title: string
  cards: KpiCardData[]
  children?: ReactNode
}

interface StructuralAnalysisChartSurfaceProps {
  children: ReactNode
}

interface StructuralAnalysisTableSectionProps {
  title: string
  headers: Array<{
    id: string
    label: ReactNode
  }>
  children: ReactNode
}

export const StructuralAnalysisSection = ({ title, children, description, icon }: StructuralAnalysisSectionProps) => {
  const titleClassName = icon
    ? 'gba:m-0 gba:mb-6 gba:text-foreground gba:text-xl gba:font-semibold gba:flex gba:items-center'
    : 'gba:m-0 gba:mb-6 gba:text-foreground gba:text-xl gba:font-semibold'

  return (
    <div>
      <h3 className={titleClassName}>
        {icon}
        {title}
      </h3>
      {description && <p className="gba:mb-4 gba:text-sm gba:text-muted-foreground">{description}</p>}
      {children}
    </div>
  )
}

export const StructuralAnalysisKpiSection = ({ title, cards, children }: StructuralAnalysisKpiSectionProps) => (
  <StructuralAnalysisSection title={title}>
    <SectionKpiCards cards={cards} />
    {children}
  </StructuralAnalysisSection>
)

export const StructuralAnalysisChartSurface = ({ children }: StructuralAnalysisChartSurfaceProps) => (
  <div className={`gba:border gba:rounded-lg gba:shadow-sm gba:p-4 ${STRUCTURAL_ANALYSIS_CHART_SURFACE_CLASS}`}>
    {children}
  </div>
)

export const StructuralAnalysisTableSection = ({ title, headers, children }: StructuralAnalysisTableSectionProps) => (
  <StructuralAnalysisSection title={title}>
    <Table>
      <TableHeader>
        <TableRow>
          {headers.map(header => (
            <TableHead key={header.id}>{header.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  </StructuralAnalysisSection>
)
