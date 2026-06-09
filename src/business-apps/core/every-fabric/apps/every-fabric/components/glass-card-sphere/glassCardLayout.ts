// Pure 3D layout math for the glass card sphere.
//
// Cards form a vertical cluster (not a flat list): alternating left/right,
// staggered along Z, with slight per-card tilt and a deterministic float phase
// so the cloud feels alive without any per-frame allocation in React.

const TWO_PI = Math.PI * 2

// Shared card geometry, also consumed by the card component so text/border
// offsets stay in sync with the body mesh.
export const CARD_WIDTH = 2.4
export const CARD_HEIGHT = 1.32
export const CARD_DEPTH = 0.12

// Vertical gap between stacked cards (less than CARD_HEIGHT so they overlap
// like the reference hero).
const Y_STEP = 1.02

export interface CardPlacement {
  position: [number, number, number]
  rotation: [number, number, number]
  floatPhase: number
  floatAmplitude: number
  floatSpeed: number
}

function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

// Deterministic 0..1 value from a seed and salt - keeps every card's offsets
// stable across renders while looking hand-placed.
function unit(seed: number, salt: number): number {
  const v = Math.sin((seed + 1) * (salt + 1) * 12.9898) * 43758.5453
  return v - Math.floor(v)
}

export function computeClusterLayout(ids: string[]): CardPlacement[] {
  const count = ids.length
  const mid = (count - 1) / 2

  return ids.map((id, index) => {
    const seed = hashSeed(id)
    const side = index % 2 === 0 ? -1 : 1
    // Cards near the centre sit closer to the axis; outer cards swing wider.
    const spread = 0.55 + unit(seed, 1) * 0.7
    const x = side * spread
    const y = (mid - index) * Y_STEP
    const z = ((index % 3) - 1) * 0.55 + (unit(seed, 2) - 0.5) * 0.4

    const rotation: [number, number, number] = [
      0.03 + (unit(seed, 3) - 0.5) * 0.06,
      side * (0.1 + unit(seed, 4) * 0.08),
      side * -0.03 + (unit(seed, 5) - 0.5) * 0.05
    ]

    return {
      position: [x, y, z],
      rotation,
      floatPhase: unit(seed, 6) * TWO_PI,
      floatAmplitude: 0.06 + unit(seed, 7) * 0.08,
      floatSpeed: 0.45 + unit(seed, 8) * 0.4
    }
  })
}
