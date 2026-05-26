// Composes the 3D mesh scene: background, lights, physics ticker, edges,
// nodes, and the OrbitControls camera rig. Owns drag arbitration so click
// vs drag is determined consistently across all node geometries.

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { MeshLayerKey } from './meshLayers'
import type { MeshNode, TraceModel } from '../../utils/traceModel'
import type { MeshPhysicsHandle } from './useMeshPhysics'
import { deriveMeshGraph } from './meshGraphSelectors'
import { Mesh3DBackground } from './Mesh3DBackground'
import { Mesh3DEdge } from './Mesh3DEdge'
import { Mesh3DNode } from './Mesh3DNode'
import { useMeshPhysics } from './useMeshPhysics'
import type { MeshThemeColors } from './useMeshTheme'

const CLICK_DURATION_MS = 250
const CLICK_DRAG_PIXELS = 6

interface OrbitControlsLike {
  target: THREE.Vector3
  update: () => void
}

function fitCameraToNodes(
  nodes: MeshNode[],
  physics: MeshPhysicsHandle,
  camera: THREE.Camera,
  controls: OrbitControlsLike | null
): void {
  if (!(camera instanceof THREE.PerspectiveCamera)) return

  const min = new THREE.Vector3(Infinity, Infinity, Infinity)
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity)
  for (const node of nodes) {
    const p = physics.getPosition(node.id)
    if (!p) continue
    min.x = Math.min(min.x, p.x)
    min.y = Math.min(min.y, p.y)
    min.z = Math.min(min.z, p.z)
    max.x = Math.max(max.x, p.x)
    max.y = Math.max(max.y, p.y)
    max.z = Math.max(max.z, p.z)
  }
  if (!Number.isFinite(min.x)) return
  const centre = min.clone().add(max).multiplyScalar(0.5)
  const radius = Math.max(min.distanceTo(centre), max.distanceTo(centre), 200)
  const fovRad = (camera.fov * Math.PI) / 180
  const distance = (radius / Math.sin(fovRad / 2)) * 1.25
  const dir = new THREE.Vector3(0.15, 0.25, 1).normalize()
  camera.position.copy(centre).add(dir.multiplyScalar(distance))
  camera.lookAt(centre)
  camera.updateProjectionMatrix()
  if (controls) {
    controls.target.copy(centre)
    controls.update()
  }
}

export interface Mesh3DSceneProps {
  model: TraceModel
  activeLayers: ReadonlySet<MeshLayerKey>
  positionMs: number
  durationMs: number
  selectedNodeId: string | null
  hoveredNodeId: string | null
  reducedMotion: boolean
  colors: MeshThemeColors
  onSelectNode: (nodeId: string | null) => void
  onSelectEdge: (edgeId: string) => void
  onHoverNode: (nodeId: string | null) => void
}

interface DragState {
  nodeId: string
  startClientX: number
  startClientY: number
  startTimeMs: number
  // Plane the pointer is being projected onto (perpendicular to camera at start).
  plane: THREE.Plane
  // Offset from the cursor's initial projected point to the node's centre.
  offset: THREE.Vector3
  moved: boolean
}

export function Mesh3DScene(props: Readonly<Mesh3DSceneProps>) {
  const {
    model,
    activeLayers,
    positionMs,
    durationMs,
    selectedNodeId,
    hoveredNodeId,
    reducedMotion,
    colors,
    onSelectNode,
    onSelectEdge,
    onHoverNode
  } = props

  const derived = useMemo(
    () => deriveMeshGraph({ model, activeLayers, positionMs, durationMs, selectedNodeId, hoveredNodeId }),
    [model, activeLayers, positionMs, durationMs, selectedNodeId, hoveredNodeId]
  )

  const physics = useMeshPhysics(derived.visibleNodes, derived.visibleEdges)

  const { camera, gl } = useThree()
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls> | null>(null)
  const dragRef = useRef<DragState | null>(null)

  // Reusable raycaster + helpers — re-creating them on every event is expensive.
  const ndc = useMemo(() => new THREE.Vector2(), [])
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const hitWorld = useMemo(() => new THREE.Vector3(), [])

  const projectToPlane = useCallback(
    (clientX: number, clientY: number, plane: THREE.Plane, target: THREE.Vector3): boolean => {
      const rect = gl.domElement.getBoundingClientRect()
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -(((clientY - rect.top) / rect.height) * 2 - 1)
      raycaster.setFromCamera(ndc, camera)
      const hit = raycaster.ray.intersectPlane(plane, target)
      return !!hit
    },
    [camera, gl, ndc, raycaster]
  )

  const handleNodePointerDown = useCallback(
    (id: string, event: Parameters<NonNullable<JSX.IntrinsicElements['mesh']['onPointerDown']>>[0]) => {
      const p = physics.getPosition(id)
      if (!p) {
        return
      }
      // Capture so we keep receiving move/up events even if the cursor leaves the canvas.
      ;(event.target as Element | undefined)?.setPointerCapture?.(event.pointerId)
      const camDir = new THREE.Vector3()
      camera.getWorldDirection(camDir)
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camDir.negate(), new THREE.Vector3(p.x, p.y, p.z))
      const initial = new THREE.Vector3()
      if (!projectToPlane(event.clientX, event.clientY, plane, initial)) return
      const offset = new THREE.Vector3(p.x - initial.x, p.y - initial.y, p.z - initial.z)
      dragRef.current = {
        nodeId: id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startTimeMs: performance.now(),
        plane,
        offset,
        moved: false
      }
      // Disable orbit controls while dragging a node so OrbitControls doesn't fight us.
      if (controlsRef.current) controlsRef.current.enabled = false
    },
    [camera, physics, projectToPlane]
  )

  const handleNodePointerMove = useCallback(
    (_id: string, event: Parameters<NonNullable<JSX.IntrinsicElements['mesh']['onPointerMove']>>[0]) => {
      const drag = dragRef.current
      if (!drag) return
      const dx = event.clientX - drag.startClientX
      const dy = event.clientY - drag.startClientY
      if (!drag.moved && dx * dx + dy * dy > CLICK_DRAG_PIXELS * CLICK_DRAG_PIXELS) {
        drag.moved = true
        physics.beginDrag(drag.nodeId)
      }
      if (!drag.moved) return
      if (!projectToPlane(event.clientX, event.clientY, drag.plane, hitWorld)) return
      const target = hitWorld.clone().add(drag.offset)
      physics.setDragPosition(drag.nodeId, { x: target.x, y: target.y, z: target.z })
    },
    [hitWorld, physics, projectToPlane]
  )

  const handleNodePointerUp = useCallback(
    (id: string, event: Parameters<NonNullable<JSX.IntrinsicElements['mesh']['onPointerUp']>>[0]) => {
      const drag = dragRef.current
      dragRef.current = null
      if (controlsRef.current) controlsRef.current.enabled = true
      try {
        ;(event.target as Element | undefined)?.releasePointerCapture?.(event.pointerId)
      } catch {
        // releasePointerCapture can throw if pointer was already released; safe to ignore.
      }
      if (!drag) return
      const elapsed = performance.now() - drag.startTimeMs
      if (!drag.moved && elapsed < CLICK_DURATION_MS) {
        // Click: toggle selection, matching the 2D path's behaviour.
        onSelectNode(selectedNodeId === id ? null : id)
        return
      }
      // Drag end: release the node so it settles back via spring forces.
      physics.endDrag(id)
    },
    [onSelectNode, physics, selectedNodeId]
  )

  const handleNodePointerEnter = useCallback(
    (id: string) => {
      if (dragRef.current) return
      onHoverNode(id)
    },
    [onHoverNode]
  )
  const handleNodePointerLeave = useCallback(() => {
    if (dragRef.current) return
    onHoverNode(null)
  }, [onHoverNode])

  // Double-click on empty space resets the simulation + camera back to defaults.
  useEffect(() => {
    const el = gl.domElement
    const handler = () => {
      physics.reset()
      controlsRef.current?.reset()
    }
    el.addEventListener('dblclick', handler)
    return () => {
      el.removeEventListener('dblclick', handler)
    }
  }, [gl.domElement, physics])

  // Fit-to-view: once the physics has settled the initial positions, frame the
  // whole graph by computing its bounding sphere and pulling the camera back
  // far enough that everything fits in the vertical FOV. Re-runs ONLY when the
  // visible node set changes (e.g. new agent comes online during replay) —
  // never on orbit/zoom/drag, otherwise the camera would snap back on every
  // pointer release.
  const fingerprint = useMemo(
    () =>
      derived.visibleNodes
        .map(n => n.id)
        .sort()
        .join('|'),
    [derived.visibleNodes]
  )
  // Refs so we can read the latest values inside the effect without putting
  // them in the dependency array (which would cause the effect to refire on
  // every render).
  const visibleNodesRef = useRef(derived.visibleNodes)
  visibleNodesRef.current = derived.visibleNodes
  const physicsRef = useRef(physics)
  physicsRef.current = physics
  useEffect(() => {
    if (visibleNodesRef.current.length === 0) return
    // Defer two frames so the physics step has populated positions.
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        fitCameraToNodes(visibleNodesRef.current, physicsRef.current, camera, controlsRef.current)
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
    // Intentionally only depending on fingerprint + camera: re-fit ONLY when
    // the actual set of visible nodes changes. Everything else is via refs.
  }, [fingerprint, camera])

  return (
    <>
      <Mesh3DBackground colors={colors} reducedMotion={reducedMotion} />
      <ambientLight intensity={colors.isDark ? 0.45 : 0.7} /> {/* NOSONAR S6747 */}
      <directionalLight position={[200, 400, 300]} intensity={0.7} /> {/* NOSONAR S6747 */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.1}
        enablePan
        screenSpacePanning
        mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
        minDistance={50}
        maxDistance={6000}
        rotateSpeed={0.6}
        zoomSpeed={1}
        panSpeed={1}
      />
      {derived.derivedEdges.map(d => (
        <Mesh3DEdge
          key={d.edge.id}
          id={d.edge.id}
          source={d.edge.source}
          target={d.edge.target}
          kind={d.edge.kind}
          isActive={d.isActive}
          isFailed={d.isFailed}
          isResolved={d.isResolved}
          isUpcoming={d.isUpcoming}
          isDimmed={d.isDimmed}
          hasDetail={d.hasDetail}
          physics={physics}
          colors={colors}
          reducedMotion={reducedMotion}
          onSelect={onSelectEdge}
        />
      ))}
      {derived.derivedNodes.map(d => (
        <Mesh3DNode
          key={d.node.id}
          id={d.node.id}
          kind={d.node.kind}
          label={d.node.label}
          category={d.category}
          status={d.node.status}
          isSelected={d.isSelected}
          isActive={d.isActive}
          isUpcoming={d.isUpcoming}
          isDimmed={d.isDimmed}
          isHighlighted={d.isHighlighted}
          skillNames={d.skillNames}
          physics={physics}
          colors={colors}
          reducedMotion={reducedMotion}
          onPointerDown={handleNodePointerDown}
          onPointerMove={handleNodePointerMove}
          onPointerUp={handleNodePointerUp}
          onPointerEnter={handleNodePointerEnter}
          onPointerLeave={handleNodePointerLeave}
        />
      ))}
    </>
  )
}
