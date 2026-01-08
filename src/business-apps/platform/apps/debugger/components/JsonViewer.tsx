import React, { useMemo } from 'react'
import { Button, useTheme } from '@newwork/nw-design-system'
import { CopyIcon } from '@phosphor-icons/react'
import CodeMirror from '@uiw/react-codemirror'
import { json as jsonLang } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'

interface JsonViewerProps {
  data: any
  title?: string
  onCopy?: () => void
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data, title, onCopy }) => {
  const { theme } = useTheme()
  const jsonString = useMemo(() => JSON.stringify(data, null, 2), [data])

  // Determine if dark mode is active
  const isDark = useMemo(() => {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    // theme === 'system'
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  }, [theme])

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(jsonString)
      if (onCopy) {
        onCopy()
      }
    } catch (error) {
      console.error('Failed to copy JSON:', error)
    }
  }

  return (
    <div className="gba:border gba:rounded gba:bg-background">
      {(title || onCopy) && (
        <div className="gba:flex gba:items-center gba:justify-between gba:p-2 gba:border-b">
          {title && <div className="gba:text-sm gba:font-medium">{title}</div>}
          {onCopy && (
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              <CopyIcon className="gba:w-4 gba:h-4 gba:mr-1" />
              Copy
            </Button>
          )}
        </div>
      )}
      <CodeMirror
        value={jsonString}
        maxHeight="600px"
        extensions={[jsonLang()]}
        theme={isDark ? oneDark : undefined}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: false,
          foldGutter: true
        }}
        readOnly={true}
        editable={false}
      />
    </div>
  )
}
