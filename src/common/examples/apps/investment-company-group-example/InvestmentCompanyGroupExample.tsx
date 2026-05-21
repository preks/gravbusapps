import React, { useCallback, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { MarkerType, Position } from '@xyflow/react'
import dagre from 'dagre'
import { InvestmentCompanyGroupGraphCanvas } from '@/business-apps/irm/investments/apps/investment-management/views/company-groups-view/components/InvestmentCompanyGroupGraphCanvas'
import { InvestmentCompanyGraphDetails } from '@/business-apps/irm/investments/apps/investment-management/views/company-groups-view/components/InvestmentCompanyGraphDetails'
import type {
  InvestmentCompanyGraphExecutive,
  InvestmentCompanyGraphNode,
  InvestmentCompanyOwnershipEdge
} from '@/business-apps/irm/investments/apps/investment-management/views/company-groups-view/types/companyGroupGraphTypes'

interface ExampleCompany {
  id: string
  name: string
  code: string
  description: string
  executives: InvestmentCompanyGraphExecutive[]
}

interface ExampleOwnership {
  source: string
  target: string
  percentage: number
}

const NODE_WIDTH = 260
const NODE_HEIGHT = 150
const EXAMPLE_COMPANY_COUNT = 300

const executiveNames = [
  'Amira Stein',
  'Jonas Weber',
  'Lea Hoffmann',
  'Mika Schneider',
  'Sofia Wagner',
  'Noah Fischer',
  'Elena Becker',
  'David Klein',
  'Maya Roth',
  'Omar Schulz'
]

const buildExecutives = (companyId: string, seed: number): InvestmentCompanyGraphExecutive[] => {
  const primaryName = executiveNames[seed % executiveNames.length]
  const secondaryName = executiveNames[(seed + 3) % executiveNames.length]

  return [
    {
      id: `${companyId}-executive-1`,
      name: primaryName,
      source: seed % 2 === 0 ? 'Employee' : 'Investment Contact',
      executiveType: seed % 3 === 0 ? 'Managing Director' : 'Board Member'
    },
    {
      id: `${companyId}-executive-2`,
      name: secondaryName,
      source: seed % 2 === 0 ? 'Investment Contact' : 'Employee',
      executiveType: seed % 4 === 0 ? 'CFO' : 'Investment Director'
    }
  ]
}

const seedCompanies: Array<[string, string, string, string]> = [
  ['atlas-holdings', 'Atlas Holdings SE', 'ATLAS', 'Top-level holding company'],
  ['nova-capital', 'Nova Capital GmbH', 'NOVA', 'European investment platform'],
  ['orion-ventures', 'Orion Ventures AG', 'ORION', 'Growth equity vehicle'],
  ['cedar-real-estate', 'Cedar Real Estate GmbH', 'CEDAR', 'Real estate portfolio'],
  ['summit-health', 'Summit Health Holding', 'SUMMIT', 'Healthcare investments'],
  ['harbor-logistics', 'Harbor Logistics GmbH', 'HARBOR', 'Logistics operations'],
  ['apex-software', 'Apex Software AG', 'APEX', 'SaaS product group'],
  ['blue-ridge-energy', 'Blue Ridge Energy', 'RIDGE', 'Renewable energy assets'],
  ['meridian-foods', 'Meridian Foods GmbH', 'MERID', 'Food and beverage platform'],
  ['pioneer-retail', 'Pioneer Retail SE', 'PION', 'Retail operating company'],
  ['northstar-ai', 'Northstar AI GmbH', 'NSAI', 'Applied AI portfolio company'],
  ['silverline-payments', 'Silverline Payments', 'SLPAY', 'Fintech payments provider'],
  ['greenfield-farms', 'Greenfield Farms AG', 'GREEN', 'Agriculture assets'],
  ['vector-mobility', 'Vector Mobility GmbH', 'VECTOR', 'Mobility and fleet services'],
  ['quantum-labs', 'Quantum Labs SE', 'QLABS', 'Deep-tech research company'],
  ['cobalt-media', 'Cobalt Media GmbH', 'COBALT', 'Media and publishing'],
  ['terra-infra', 'Terra Infrastructure', 'TERRA', 'Infrastructure projects'],
  ['aurora-bio', 'Aurora Bio AG', 'AUBIO', 'Biotech investments'],
  ['lumen-education', 'Lumen Education GmbH', 'LUMEN', 'Education technology'],
  ['zenith-cyber', 'Zenith Cyber SE', 'ZCYBER', 'Cybersecurity company']
]

const generatedIndustries = [
  'Digital services',
  'Healthcare platform',
  'Logistics network',
  'Renewable infrastructure',
  'Education services',
  'Cybersecurity operations',
  'Industrial technology',
  'Financial services',
  'Agriculture portfolio',
  'Real estate assets'
]

const generatedCompanySuffixes = ['GmbH', 'AG', 'SE', 'Holding', 'Group']

const getOwnershipPercentage = (index: number): number => {
  return Number((18 + ((index * 13) % 72) + (index % 4) * 0.5).toFixed(1))
}

const exampleCompanies: ExampleCompany[] = Array.from({ length: EXAMPLE_COMPANY_COUNT }, (_, index) => {
  const seedCompany = seedCompanies[index]

  if (seedCompany) {
    const [id, name, code, description] = seedCompany
    return {
      id,
      name,
      code,
      description,
      executives: buildExecutives(id, index)
    }
  }

  const companyNumber = index + 1
  const industry = generatedIndustries[index % generatedIndustries.length]
  const suffix = generatedCompanySuffixes[index % generatedCompanySuffixes.length]
  const id = `portfolio-company-${companyNumber}`

  return {
    id,
    name: `Portfolio Company ${companyNumber} ${suffix}`,
    code: `PC${String(companyNumber).padStart(3, '0')}`,
    description: industry,
    executives: buildExecutives(id, index)
  }
})

const exampleOwnerships: ExampleOwnership[] = exampleCompanies.flatMap((company, index) => {
  if (index === 0) return []

  const parentIndex = Math.floor((index - 1) / 3)
  const ownerships: ExampleOwnership[] = [
    {
      source: exampleCompanies[parentIndex].id,
      target: company.id,
      percentage: getOwnershipPercentage(index)
    }
  ]

  if (index > 12 && index % 11 === 0) {
    ownerships.push({
      source: exampleCompanies[Math.max(1, index - 7)].id,
      target: company.id,
      percentage: getOwnershipPercentage(index + 5)
    })
  }

  if (index > 30 && index % 17 === 0) {
    ownerships.push({
      source: exampleCompanies[Math.floor(index / 2)].id,
      target: company.id,
      percentage: getOwnershipPercentage(index + 9)
    })
  }

  return ownerships
})

function layoutNodes(
  nodes: InvestmentCompanyGraphNode[],
  edges: InvestmentCompanyOwnershipEdge[]
): InvestmentCompanyGraphNode[] {
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: 'TB', nodesep: 90, ranksep: 120, marginx: 40, marginy: 40 })

  nodes.forEach(node => graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
  edges.forEach(edge => graph.setEdge(edge.source, edge.target))
  dagre.layout(graph)

  return nodes.map(node => {
    const position = graph.node(node.id)
    return {
      ...node,
      position: {
        x: (position?.x ?? 0) - NODE_WIDTH / 2,
        y: (position?.y ?? 0) - NODE_HEIGHT / 2
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top
    }
  })
}

export const InvestmentCompanyGroupExample: React.FC = () => {
  const [selectedInvestmentCompanyId, setSelectedInvestmentCompanyId] = useState<string | undefined>()

  const handleSelectInvestmentCompany = useCallback((investmentCompanyId: string) => {
    setSelectedInvestmentCompanyId(investmentCompanyId)
  }, [])

  const { nodes, edges } = useMemo(() => {
    const ownershipCounts = new Map<string, { ownedCompaniesCount: number; ownersCount: number }>()

    exampleCompanies.forEach(company => {
      ownershipCounts.set(company.id, { ownedCompaniesCount: 0, ownersCount: 0 })
    })
    exampleOwnerships.forEach(ownership => {
      const source = ownershipCounts.get(ownership.source)
      const target = ownershipCounts.get(ownership.target)
      if (source) source.ownedCompaniesCount += 1
      if (target) target.ownersCount += 1
    })

    const graphNodes: InvestmentCompanyGraphNode[] = exampleCompanies.map(company => {
      const counts = ownershipCounts.get(company.id)
      return {
        id: company.id,
        type: 'investmentCompany',
        position: { x: 0, y: 0 },
        data: {
          investmentCompanyId: company.id,
          name: company.name,
          code: company.code,
          description: company.description,
          executives: company.executives,
          ownedCompaniesCount: counts?.ownedCompaniesCount ?? 0,
          ownersCount: counts?.ownersCount ?? 0,
          onOpenCompany: handleSelectInvestmentCompany
        }
      }
    })

    const graphEdges: InvestmentCompanyOwnershipEdge[] = exampleOwnerships.map(ownership => ({
      id: `${ownership.source}-${ownership.target}`,
      source: ownership.source,
      target: ownership.target,
      type: 'ownership',
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
      data: { percentage: ownership.percentage }
    }))

    return {
      nodes: layoutNodes(graphNodes, graphEdges),
      edges: graphEdges
    }
  }, [handleSelectInvestmentCompany])

  return (
    <div className="gba:h-screen gba:p-6" data-testid="investment-company-group-example">
      <Card className="gba:h-full gba:overflow-hidden">
        <CardHeader>
          <CardTitle>Example Investment Company Group: {EXAMPLE_COMPANY_COUNT} Companies</CardTitle>
        </CardHeader>
        <CardContent className="gba:h-[calc(100%-72px)] gba:p-0">
          <InvestmentCompanyGroupGraphCanvas nodes={nodes} edges={edges} />
          {selectedInvestmentCompanyId && (
            <InvestmentCompanyGraphDetails
              investmentCompanyId={selectedInvestmentCompanyId}
              nodes={nodes}
              edges={edges}
              onOpenChange={open => {
                if (!open) setSelectedInvestmentCompanyId(undefined)
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default InvestmentCompanyGroupExample
