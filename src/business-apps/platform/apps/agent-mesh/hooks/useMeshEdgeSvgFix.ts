import { useEffect, type RefObject } from 'react'

/**
 * NUCLEAR FIX: ReactFlow renders each edge inside its own <svg> element with
 * NO width/height attributes. It relies on CSS `overflow: visible` to let
 * paths render beyond the default 300x150 SVG viewport. In the deployed
 * platform, something (CSS reset, ancestor overflow:hidden, micro-frontend
 * container) prevents overflow:visible from working on SVG elements.
 *
 * This hook uses direct DOM manipulation + MutationObserver to force every
 * edge <svg> to cover the full ReactFlow container.
 */
export function useMeshEdgeSvgFix(wrapperRef: RefObject<HTMLDivElement | null>, edgesDep: unknown[]): void {
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const fixEdgeSvgs = () => {
      const edgesContainer = wrapper.querySelector('.react-flow__edges') as HTMLElement | null
      if (edgesContainer) {
        edgesContainer.style.setProperty('position', 'absolute', 'important')
        edgesContainer.style.setProperty('top', '0', 'important')
        edgesContainer.style.setProperty('left', '0', 'important')
        edgesContainer.style.setProperty('width', '100%', 'important')
        edgesContainer.style.setProperty('height', '100%', 'important')
        edgesContainer.style.setProperty('overflow', 'visible', 'important')
      }

      const svgs = wrapper.querySelectorAll('.react-flow__edges svg')
      svgs.forEach(svg => {
        const el = svg as SVGSVGElement
        el.setAttribute('width', '100%')
        el.setAttribute('height', '100%')
        el.style.setProperty('position', 'absolute', 'important')
        el.style.setProperty('top', '0', 'important')
        el.style.setProperty('left', '0', 'important')
        el.style.setProperty('width', '100%', 'important')
        el.style.setProperty('height', '100%', 'important')
        el.style.setProperty('overflow', 'visible', 'important')
      })

      const viewport = wrapper.querySelector('.react-flow__viewport') as HTMLElement | null
      if (viewport) viewport.style.setProperty('overflow', 'visible', 'important')
      const renderer = wrapper.querySelector('.react-flow__renderer') as HTMLElement | null
      if (renderer) renderer.style.setProperty('overflow', 'visible', 'important')
    }

    fixEdgeSvgs()
    const timer = setTimeout(fixEdgeSvgs, 500)

    const observer = new MutationObserver(fixEdgeSvgs)
    observer.observe(wrapper, { childList: true, subtree: true })

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, edgesDep)
}
