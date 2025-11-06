import React from 'react'
import type { Dayjs } from 'dayjs'

export const useStripRcPickerTitle = (dateCellRender: (value: Dayjs) => React.ReactNode) => {
  return (value: Dayjs, info: any): React.ReactNode => {
    const originNode = info?.originNode
    const cleanOriginNode =
      originNode && React.isValidElement(originNode)
        ? React.cloneElement(originNode as React.ReactElement, { title: undefined })
        : originNode

    // Wrapper that removes the native title attribute from the parent td
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

    if (info?.type === 'date') {
      const rendered = dateCellRender(value)
      return React.createElement(NoTitleWrapper, null, rendered ?? cleanOriginNode)
    }
    return React.createElement(NoTitleWrapper, null, cleanOriginNode)
  }
}
