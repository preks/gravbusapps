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

const exampleCompanies: ExampleCompany[] = [
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
].map(([id, name, code, description], index) => ({
  id,
  name,
  code,
  description,
  executives: buildExecutives(id, index)
}))

const exampleOwnerships: ExampleOwnership[] = [
  { source: 'atlas-holdings', target: 'nova-capital', percentage: 85 },
  { source: 'atlas-holdings', target: 'orion-ventures', percentage: 72.5 },
  { source: 'atlas-holdings', target: 'cedar-real-estate', percentage: 64 },
  { source: 'nova-capital', target: 'summit-health', percentage: 58 },
  { source: 'nova-capital', target: 'harbor-logistics', percentage: 41 },
  { source: 'nova-capital', target: 'apex-software', percentage: 76 },
  { source: 'orion-ventures', target: 'northstar-ai', percentage: 62 },
  { source: 'orion-ventures', target: 'silverline-payments', percentage: 49 },
  { source: 'orion-ventures', target: 'quantum-labs', percentage: 33.3 },
  { source: 'cedar-real-estate', target: 'blue-ridge-energy', percentage: 25 },
  { source: 'cedar-real-estate', target: 'terra-infra', percentage: 52 },
  { source: 'summit-health', target: 'aurora-bio', percentage: 67 },
  { source: 'harbor-logistics', target: 'vector-mobility', percentage: 38 },
  { source: 'apex-software', target: 'zenith-cyber', percentage: 55 },
  { source: 'apex-software', target: 'lumen-education', percentage: 46 },
  { source: 'meridian-foods', target: 'greenfield-farms', percentage: 80 },
  { source: 'atlas-holdings', target: 'meridian-foods', percentage: 51 },
  { source: 'meridian-foods', target: 'pioneer-retail', percentage: 35 },
  { source: 'pioneer-retail', target: 'cobalt-media', percentage: 22.5 },
  { source: 'silverline-payments', target: 'zenith-cyber', percentage: 18 },
  { source: 'blue-ridge-energy', target: 'terra-infra', percentage: 29 },
  { source: 'northstar-ai', target: 'quantum-labs', percentage: 14 }
]

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
          <CardTitle>Example Investment Company Group: 20 Companies</CardTitle>
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
