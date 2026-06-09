// Company agent mesh rendered as the shared 3D glass card sphere.
//
// A premium, rotatable alternative to the mesh graph: one glass card per top
// company agent (value = invocations, live agents pulse). Uses the white,
// ultra-modern light theme so it matches the bright mesh canvas.

import { useMemo } from 'react'
import { GlassCardScene } from '../glass-card-sphere/GlassCardScene'
import { LIGHT_GLASS_THEME } from '../glass-card-sphere/glassCardTheme'
import type { AggregateStats } from '../../utils/meshAggregateModel'
import type { MeshLiveActivityState } from './liveMeshActivity'
import { buildMeshAgentCards, buildMeshKpis } from './meshGlassCardModel'

interface AgentMeshGlassSphereProps {
  stats: AggregateStats
  liveActivity: MeshLiveActivityState
}

export const AgentMeshGlassSphere: React.FC<AgentMeshGlassSphereProps> = ({ stats, liveActivity }) => {
  const cards = useMemo(() => buildMeshAgentCards(stats, liveActivity), [stats, liveActivity])
  const kpis = useMemo(() => buildMeshKpis(stats), [stats])

  return (
    <GlassCardScene
      cards={cards}
      kpis={kpis}
      theme={LIGHT_GLASS_THEME}
      heading={{
        label: 'Company agents',
        value: `${stats.agentCount} agent${stats.agentCount === 1 ? '' : 's'}`
      }}
      testId="agent-mesh-glass-sphere"
    />
  )
}

export default AgentMeshGlassSphere
