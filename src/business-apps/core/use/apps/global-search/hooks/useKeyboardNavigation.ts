import { useEffect, useMemo, useRef, useState } from 'react'

export interface NavigationSection {
  itemCount: number
  isHorizontal: boolean
}

export interface UseKeyboardNavigationOptions {
  enabled: boolean
  sections: NavigationSection[]
  onEnter?: (sectionIndex: number, itemIndex: number) => void
  onEscape?: () => void
}

interface NavigationPosition {
  sectionIndex: number
  itemIndex: number
  isHorizontal: boolean
  isFirstInSection: boolean
  isLastInSection: boolean
}

const NO_ACTIVE_POSITION_INDEX = -1

const buildPositions = (sections: NavigationSection[]): NavigationPosition[] =>
  sections.flatMap((section, sectionIndex) => {
    if (section.itemCount === 0) return []
    return Array.from({ length: section.itemCount }, (_, itemIndex) => ({
      sectionIndex,
      itemIndex,
      isHorizontal: section.isHorizontal,
      isFirstInSection: itemIndex === 0,
      isLastInSection: itemIndex === section.itemCount - 1
    }))
  })

const firstOfSection = (positions: NavigationPosition[], sectionIndex: number): number =>
  positions.findIndex(p => p.sectionIndex === sectionIndex)

const lastOfSection = (positions: NavigationPosition[], sectionIndex: number): number => {
  let last = -1
  for (let i = 0; i < positions.length; i++) {
    if (positions[i].sectionIndex === sectionIndex) last = i
  }
  return last
}

const moveDown = (positions: NavigationPosition[], curr: number): number => {
  const pos = positions[curr]
  if (!pos) return 0
  if (pos.isHorizontal || pos.isLastInSection) {
    const next = firstOfSection(positions, pos.sectionIndex + 1)
    return next >= 0 ? next : curr
  }
  return curr + 1
}

const moveUp = (positions: NavigationPosition[], curr: number): number => {
  const pos = positions[curr]
  if (!pos) return 0
  if (pos.isHorizontal || pos.isFirstInSection) {
    const prevSectionIndex = pos.sectionIndex - 1
    const prevIsHorizontal = positions.find(p => p.sectionIndex === prevSectionIndex)?.isHorizontal
    const prevPos = prevIsHorizontal
      ? firstOfSection(positions, prevSectionIndex)
      : lastOfSection(positions, prevSectionIndex)
    return prevPos >= 0 ? prevPos : NO_ACTIVE_POSITION_INDEX
  }
  return curr - 1
}

const moveRight = (positions: NavigationPosition[], curr: number): number => {
  const pos = positions[curr]
  if (!pos?.isHorizontal) return curr
  const next = curr + 1
  return next < positions.length && positions[next].sectionIndex === pos.sectionIndex ? next : curr
}

const moveLeft = (positions: NavigationPosition[], curr: number): number => {
  const pos = positions[curr]
  if (!pos?.isHorizontal) return curr
  const prev = curr - 1
  return prev >= 0 && positions[prev].sectionIndex === pos.sectionIndex ? prev : NO_ACTIVE_POSITION_INDEX
}

export const useKeyboardNavigation = ({
  enabled,
  sections,
  onEnter,
  onEscape
}: UseKeyboardNavigationOptions): { activePositionIndex: number; positions: readonly NavigationPosition[] } => {
  const positions = useMemo(() => buildPositions(sections), [sections])
  const [activePositionIndex, setActivePositionIndex] = useState(NO_ACTIVE_POSITION_INDEX)

  const positionsRef = useRef(positions)
  positionsRef.current = positions

  const onEnterRef = useRef(onEnter)
  onEnterRef.current = onEnter

  const onEscapeRef = useRef(onEscape)
  onEscapeRef.current = onEscape

  useEffect(() => {
    setActivePositionIndex(NO_ACTIVE_POSITION_INDEX)
  }, [positions])

  useEffect(() => {
    if (!enabled) {
      setActivePositionIndex(NO_ACTIVE_POSITION_INDEX)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const pos = positionsRef.current
      if (pos.length === 0) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActivePositionIndex(curr => (curr === NO_ACTIVE_POSITION_INDEX ? 0 : moveDown(pos, curr)))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActivePositionIndex(curr => (curr === NO_ACTIVE_POSITION_INDEX ? curr : moveUp(pos, curr)))
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        setActivePositionIndex(curr => (curr === NO_ACTIVE_POSITION_INDEX ? curr : moveRight(pos, curr)))
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setActivePositionIndex(curr => (curr === NO_ACTIVE_POSITION_INDEX ? curr : moveLeft(pos, curr)))
      } else if (event.key === 'Enter') {
        event.preventDefault()
        setActivePositionIndex(curr => {
          const position = pos[curr]
          if (position) {
            onEnterRef.current?.(position.sectionIndex, position.itemIndex)
          }
          return curr
        })
      } else if (event.key === 'Escape') {
        event.preventDefault()
        onEscapeRef.current?.()
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [enabled])

  return { activePositionIndex, positions }
}
