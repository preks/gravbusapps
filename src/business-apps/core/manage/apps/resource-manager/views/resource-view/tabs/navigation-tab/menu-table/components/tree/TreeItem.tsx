import React, { forwardRef } from 'react'
import styles from './TreeItem.module.css'

export const DragHandleContext = React.createContext<any>(null)

interface TreeItemProps {
  children: React.ReactNode
  clone?: boolean
  ghost?: boolean
  indentationWidth: number
  handleProps?: any
  wrapperRef?: (node: HTMLLIElement) => void
  style?: React.CSSProperties
}

export const TreeItem = forwardRef<HTMLDivElement, TreeItemProps>(
  ({ children, clone = false, ghost = false, indentationWidth, handleProps, wrapperRef, style }, ref) => {
    const wrapperClasses = [clone && styles.clone, ghost && styles.ghost].filter(Boolean).join(' ')

    return (
      <DragHandleContext.Provider value={handleProps}>
        <li
          ref={wrapperRef}
          className={wrapperClasses}
          style={{
            listStyle: 'none',
            boxSizing: 'border-box',
            paddingLeft: `${indentationWidth}px`,
            marginBottom: '-1px'
          }}
        >
          <div ref={ref} style={style}>
            {children}
          </div>
        </li>
      </DragHandleContext.Provider>
    )
  }
)

TreeItem.displayName = 'TreeItem'
