import { useState, useCallback } from 'react'
import { toPng } from 'html-to-image'
import { getNodesBounds, getViewportForBounds, useReactFlow } from '@xyflow/react'

const IMAGE_WIDTH = 1920
const IMAGE_HEIGHT = 1080
const PADDING = 0.2

function downloadImage(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.setAttribute('download', filename)
  a.setAttribute('href', dataUrl)
  a.click()
}

export function useFlowExport(filename = 'flow') {
  const { getNodes } = useReactFlow()
  const [isExporting, setIsExporting] = useState(false)

  const exportPng = useCallback(async () => {
    const nodes = getNodes()
    if (nodes.length === 0) return

    const viewport = document.querySelector<HTMLElement>('.react-flow__viewport')
    if (!viewport) return

    setIsExporting(true)

    try {
      const nodesBounds = getNodesBounds(nodes)
      const { x, y, zoom } = getViewportForBounds(nodesBounds, IMAGE_WIDTH, IMAGE_HEIGHT, 0.5, 2, PADDING)

      const dataUrl = await toPng(viewport, {
        backgroundColor: undefined,
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        style: {
          width: String(IMAGE_WIDTH),
          height: String(IMAGE_HEIGHT),
          transform: `translate(${x}px, ${y}px) scale(${zoom})`
        }
      })

      downloadImage(dataUrl, `${filename}.png`)
    } finally {
      setIsExporting(false)
    }
  }, [getNodes, filename])

  return { exportPng, isExporting }
}
