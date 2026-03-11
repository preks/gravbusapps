import React, { useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { json as jsonLang } from '@codemirror/lang-json'

export interface CodeEditorProps {
  value: string
  onChange: (v: string) => void
  language: 'javascript' | 'json'
  height?: string
  readOnly?: boolean
  'data-testid'?: string
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language,
  height = '400px',
  readOnly,
  'data-testid': testId
}) => {
  const extensions = useMemo(() => {
    if (language === 'javascript') return [javascript({ jsx: true })]
    return [jsonLang()]
  }, [language])

  return (
    <CodeMirror
      value={value}
      height={height}
      extensions={extensions}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        autocompletion: true,
        foldGutter: true
      }}
      readOnly={!!readOnly}
      onChange={onChange}
      data-testid={testId}
    />
  )
}

export default CodeEditor
