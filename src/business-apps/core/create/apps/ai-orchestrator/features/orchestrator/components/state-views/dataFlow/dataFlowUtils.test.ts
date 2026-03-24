import type { ComponentSpec } from '../../../types/components'
import type { DiagramEdge, DiagramNode } from './dataFlowUtils'
import {
  buildDiagram,
  getEdgePath,
  CROSS_LAYER_SAME_SOURCE_STAGGER,
  CROSS_LAYER_STEM_STAGGER,
  HIGHWAY_EX,
  LAYER_H_GAP,
  NODE_H,
  NODE_V_GAP,
  NODE_W,
  PAD_TOP,
  PAD_X
} from './dataFlowUtils'

function baseComp(overrides: Partial<ComponentSpec> & Pick<ComponentSpec, 'id' | 'type' | 'name'>): ComponentSpec {
  return {
    description: '',
    status: 'completed',
    dependencies: [],
    ...overrides
  }
}

describe('dataFlowUtils', () => {
  describe('same-layer stacked data models', () => {
    it('same-layer data model dependencies are filtered out to avoid clutter', () => {
      const cycle = baseComp({
        id: 'cycle',
        type: 'data_model',
        name: 'CompensationCycle'
      })
      const plan = baseComp({
        id: 'plan',
        type: 'data_model',
        name: 'CompensationPlan',
        dependencies: ['cycle']
      })

      const layout = buildDiagram([cycle, plan])
      // Even with explicit dependency, same-layer data model edges are filtered
      const edge = layout.edges.find(e => e.sourceId === 'cycle' && e.targetId === 'plan')
      expect(edge).toBeUndefined()
    })

    it('routes upward along the spine when source is below target (same column)', () => {
      const highComp = baseComp({ id: 'high', type: 'data_model', name: 'High' })
      const lowComp = baseComp({ id: 'low', type: 'data_model', name: 'Low' })
      const src: DiagramNode = {
        id: 'low',
        component: lowComp,
        layerIndex: 0,
        indexInLayer: 1,
        x: PAD_X,
        y: PAD_TOP + NODE_H + NODE_V_GAP
      }
      const tgt: DiagramNode = {
        id: 'high',
        component: highComp,
        layerIndex: 0,
        indexInLayer: 0,
        x: PAD_X,
        y: PAD_TOP
      }
      const edge: DiagramEdge = {
        id: 'low->high',
        sourceId: 'low',
        targetId: 'high',
        label: 'Related',
        color: 'var(--nw-info)',
        isCrossLayer: false,
        arcY: 0,
        crossStemSlot: 0,
        isBidirectional: false
      }
      const cx = PAD_X + NODE_W / 2
      expect(getEdgePath(edge, src, tgt)).toBe(`M ${cx},${src.y} L ${cx},${tgt.y + NODE_H}`)
    })
  })

  describe('adjacent-column data_model → function', () => {
    it('when rows align, uses a straight horizontal through the column gutter', () => {
      const dm = baseComp({ id: 'dm', type: 'data_model', name: 'Entity' })
      const fn = baseComp({ id: 'fn', type: 'function', name: 'allocate' })
      const layout = buildDiagram([dm, fn])

      const edge = layout.edges.find(e => e.sourceId === 'dm' && e.targetId === 'fn')
      expect(edge).toBeDefined()
      expect(edge!.isCrossLayer).toBe(false)

      const src = layout.nodes.find(n => n.id === 'dm')!
      const tgt = layout.nodes.find(n => n.id === 'fn')!
      const sx = src.x + NODE_W
      const tx = tgt.x
      const sy = src.y + NODE_H / 2

      expect(sx).toBe(PAD_X + NODE_W)
      expect(tx).toBe(PAD_X + NODE_W + LAYER_H_GAP)
      const d = getEdgePath(edge!, src, tgt)
      expect(d).toBe(`M ${sx},${sy} L ${tx},${sy}`)
    })

    it('when rows differ, uses Z-routing with midX strictly between column rects', () => {
      const dmTop = baseComp({ id: 'dmTop', type: 'data_model', name: 'Parent' })
      const dmChild = baseComp({ id: 'dmChild', type: 'data_model', name: 'Child', dependencies: ['dmTop'] })
      const fn = baseComp({ id: 'fn', type: 'function', name: 'allocate', dependencies: ['dmChild'] })
      const layout = buildDiagram([dmTop, dmChild, fn])

      const edge = layout.edges.find(e => e.sourceId === 'dmChild' && e.targetId === 'fn')
      expect(edge).toBeDefined()

      const src = layout.nodes.find(n => n.id === 'dmChild')!
      const tgt = layout.nodes.find(n => n.id === 'fn')!
      const sx = src.x + NODE_W
      const tx = tgt.x
      const midXRaw = (sx + tx) / 2 + src.indexInLayer * 26
      const midX = Math.min(tgt.x - 12, Math.max(sx + 12, midXRaw))

      expect(midX).toBeGreaterThan(src.x + NODE_W)
      expect(midX).toBeLessThan(tgt.x)

      const d = getEdgePath(edge!, src, tgt)
      expect(d).toContain(`${midX}`)
      expect(d).toMatch(/^M /)
    })
  })

  describe('multiple data_model → screen (cross-layer)', () => {
    it('staggers highway stems by row so edges do not stack as one misleading path', () => {
      const cycle = baseComp({ id: 'cycle', type: 'data_model', name: 'CompensationCycle' })
      const plan = baseComp({
        id: 'plan',
        type: 'data_model',
        name: 'CompensationPlan',
        dependencies: ['cycle']
      })
      const fn = baseComp({ id: 'fn', type: 'function', name: 'allocate' })
      const flow = baseComp({ id: 'flow', type: 'flow', name: 'CompensationPlanning' })
      const screen = baseComp({
        id: 'scr',
        type: 'screen',
        name: 'CompensationDashboard',
        metadata: { dataModelIds: ['cycle', 'plan'] }
      })

      const layout = buildDiagram([cycle, plan, fn, flow, screen])
      const eCycle = layout.edges.find(e => e.sourceId === 'cycle' && e.targetId === 'scr')
      const ePlan = layout.edges.find(e => e.sourceId === 'plan' && e.targetId === 'scr')
      expect(eCycle?.isCrossLayer).toBe(true)
      expect(ePlan?.isCrossLayer).toBe(true)

      const nCycle = layout.nodes.find(n => n.id === 'cycle')!
      const nPlan = layout.nodes.find(n => n.id === 'plan')!
      const nScr = layout.nodes.find(n => n.id === 'scr')!

      const stem0 =
        PAD_X +
        NODE_W +
        HIGHWAY_EX +
        nCycle.indexInLayer * CROSS_LAYER_STEM_STAGGER +
        eCycle!.crossStemSlot * CROSS_LAYER_SAME_SOURCE_STAGGER
      const stem1 =
        PAD_X +
        NODE_W +
        HIGHWAY_EX +
        nPlan.indexInLayer * CROSS_LAYER_STEM_STAGGER +
        ePlan!.crossStemSlot * CROSS_LAYER_SAME_SOURCE_STAGGER
      expect(stem0).not.toBe(stem1)

      const d0 = getEdgePath(eCycle!, nCycle, nScr)
      const d1 = getEdgePath(ePlan!, nPlan, nScr)
      expect(d0).toContain(`${stem0}`)
      expect(d1).toContain(`${stem1}`)

      const planCenterY = nPlan.y + NODE_H / 2
      const planAttachY = Math.min(nPlan.y + NODE_H - 12, Math.max(nPlan.y + 12, nPlan.y + NODE_H * 0.27))
      expect(planAttachY).not.toBe(planCenterY)
      const planPathStart = d1.match(/^M [\d.]+,([\d.]+)/)
      expect(planPathStart).toBeTruthy()
      expect(parseFloat(planPathStart![1])).toBeCloseTo(planAttachY, 4)
      expect(Math.abs(parseFloat(planPathStart![1]) - planCenterY)).toBeGreaterThan(20)

      const tx = nScr.x
      const ty = nScr.y + NODE_H / 2
      expect(d0.endsWith(`L ${tx},${ty}`)).toBe(true)
      expect(d1.endsWith(`L ${tx},${ty}`)).toBe(true)
    })
  })

  describe('cross-layer backward (source visually right of target)', () => {
    it('exits left from source and enters right of target', () => {
      const dmComp = baseComp({ id: 'dm', type: 'data_model', name: 'D' })
      const scrComp = baseComp({ id: 'scr', type: 'screen', name: 'S' })
      const screenX = PAD_X + 3 * (NODE_W + LAYER_H_GAP)
      const src: DiagramNode = {
        id: 'scr',
        component: scrComp,
        layerIndex: 3,
        indexInLayer: 0,
        x: screenX,
        y: PAD_TOP
      }
      const tgt: DiagramNode = {
        id: 'dm',
        component: dmComp,
        layerIndex: 0,
        indexInLayer: 0,
        x: PAD_X,
        y: PAD_TOP
      }
      const edge: DiagramEdge = {
        id: 'scr->dm',
        sourceId: 'scr',
        targetId: 'dm',
        label: 'Connected to',
        color: 'var(--nw-success-on-card)',
        isCrossLayer: true,
        arcY: 60,
        crossStemSlot: 0,
        isBidirectional: false
      }
      expect(src.x + NODE_W < tgt.x).toBe(false)
      const d = getEdgePath(edge, src, tgt)
      expect(d.startsWith(`M ${src.x},`)).toBe(true)
      expect(d).toContain(`${tgt.x + NODE_W},${tgt.y + NODE_H / 2}`)
    })
  })

  describe('bidirectional edges', () => {
    it('marks data_model → screen edges as bidirectional', () => {
      const dm = baseComp({ id: 'dm', type: 'data_model', name: 'Entity' })
      const screen = baseComp({
        id: 'scr',
        type: 'screen',
        name: 'Dashboard',
        metadata: { dataModelIds: ['dm'] }
      })
      const layout = buildDiagram([dm, screen])

      const edge = layout.edges.find(e => e.sourceId === 'dm' && e.targetId === 'scr')
      expect(edge).toBeDefined()
      expect(edge!.isBidirectional).toBe(true)
    })

    it('does not mark other edge types as bidirectional', () => {
      const dm = baseComp({ id: 'dm', type: 'data_model', name: 'Entity' })
      const fn = baseComp({ id: 'fn', type: 'function', name: 'process', dependencies: ['dm'] })
      const layout = buildDiagram([dm, fn])

      const edge = layout.edges.find(e => e.sourceId === 'dm' && e.targetId === 'fn')
      expect(edge).toBeDefined()
      expect(edge!.isBidirectional).toBe(false)
    })

    it('does not connect two data models in the same layer during inference', () => {
      const cycle = baseComp({ id: 'cycle', type: 'data_model', name: 'CompensationCycle' })
      const alloc = baseComp({ id: 'alloc', type: 'data_model', name: 'CompensationAllocation' })
      const screen = baseComp({ id: 'scr', type: 'screen', name: 'Dashboard' })
      const layout = buildDiagram([cycle, alloc, screen])

      // Should have cycle→screen and alloc→screen, but NOT cycle→alloc or alloc→cycle
      const cycleToAlloc = layout.edges.find(e => e.sourceId === 'cycle' && e.targetId === 'alloc')
      const allocToCycle = layout.edges.find(e => e.sourceId === 'alloc' && e.targetId === 'cycle')
      expect(cycleToAlloc).toBeUndefined()
      expect(allocToCycle).toBeUndefined()

      const cycleToScreen = layout.edges.find(e => e.sourceId === 'cycle' && e.targetId === 'scr')
      const allocToScreen = layout.edges.find(e => e.sourceId === 'alloc' && e.targetId === 'scr')
      expect(cycleToScreen).toBeDefined()
      expect(allocToScreen).toBeDefined()
    })

    it('filters out explicit data_model → data_model dependencies in same layer', () => {
      const cycle = baseComp({ id: 'cycle', type: 'data_model', name: 'CompensationCycle' })
      // Even with explicit dependency, same-layer data model connections should be hidden
      const alloc = baseComp({
        id: 'alloc',
        type: 'data_model',
        name: 'CompensationAllocation',
        dependencies: ['cycle']
      })
      const screen = baseComp({ id: 'scr', type: 'screen', name: 'Dashboard' })
      const layout = buildDiagram([cycle, alloc, screen])

      // Should NOT show cycle→alloc even though it's explicit
      const cycleToAlloc = layout.edges.find(e => e.sourceId === 'cycle' && e.targetId === 'alloc')
      expect(cycleToAlloc).toBeUndefined()

      // But should still show connections to screen
      const cycleToScreen = layout.edges.find(e => e.sourceId === 'cycle' && e.targetId === 'scr')
      const allocToScreen = layout.edges.find(e => e.sourceId === 'alloc' && e.targetId === 'scr')
      expect(cycleToScreen).toBeDefined()
      expect(allocToScreen).toBeDefined()
    })
  })
})
