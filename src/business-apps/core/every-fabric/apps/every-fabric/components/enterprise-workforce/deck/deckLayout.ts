// Pure layout math for the Agent Deck.
//
// Cards sit upright in an overlapping row (a clean, professional deck - no
// tilt). Hovering/focusing a card lifts and scales it above the rest while its
// neighbours slide aside to make room (the dock-magnify effect). Kept pure so
// it can be reasoned about and unit-tested without React.

export interface DeckTransform {
  transform: string
  zIndex: number
}

const HOVER_LIFT_PX = 18
const HOVER_SCALE = 1.08
const NEIGHBOUR_SHIFT_PX = 24
const NEIGHBOUR_SCALE = 0.97

/**
 * @param index    card position
 * @param count    total cards
 * @param hovered  index of the hovered/active card, or null when none is active
 */
export function computeDeckTransform(index: number, count: number, hovered: number | null): DeckTransform {
  if (hovered === null) {
    // Right-hand cards naturally sit on top, like a fanned hand of cards.
    return { transform: 'none', zIndex: index + 1 }
  }

  if (index === hovered) {
    return {
      transform: `translateY(${-HOVER_LIFT_PX}px) scale(${HOVER_SCALE})`,
      zIndex: count + 10
    }
  }

  const direction = index < hovered ? -1 : 1
  const distance = Math.abs(index - hovered)
  const shift = direction * Math.max(0, NEIGHBOUR_SHIFT_PX - (distance - 1) * 8)
  return {
    transform: `translateX(${shift}px) scale(${NEIGHBOUR_SCALE})`,
    zIndex: index + 1
  }
}
