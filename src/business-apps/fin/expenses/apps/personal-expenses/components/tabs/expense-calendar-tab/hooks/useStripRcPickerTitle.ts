import React from 'react'
import type { Dayjs } from 'dayjs'

// Stable wrapper to strip native title attribute from the closest td
const NoTitleWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = React.useRef<HTMLDivElement>(null)

  const stripTitle = React.useCallback(() => {
    const td = ref.current?.closest('td') as HTMLElement | null
    if (td && td.getAttribute('title') !== null) {
      td.removeAttribute('title')
    }
  }, [])

  React.useEffect(() => {
    stripTitle()
  }, [stripTitle])

  return React.createElement('div', { ref, onMouseEnter: stripTitle, onFocus: stripTitle }, children)
}

export const useStripRcPickerTitle = (dateCellRender: (value: Dayjs) => React.ReactNode) => {
  return (value: Dayjs, info: any): React.ReactNode => {
    const originNode = info?.originNode
    const cleanOriginNode =
      originNode && React.isValidElement(originNode)
        ? React.cloneElement(originNode as React.ReactElement, { title: undefined })
        : originNode

    if (info?.type === 'date') {
      const rendered = dateCellRender(value)
      return React.createElement(NoTitleWrapper, null, rendered ?? cleanOriginNode)
    }
    // For non-date cells, avoid extra wrapper for performance
    return cleanOriginNode
  }
}
