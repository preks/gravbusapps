import React, { useRef, useEffect, useState } from 'react'
import { Button, Popover, PopoverContent, PopoverTrigger } from '@newwork/nw-design-system'
import { parseFTL } from '../utils/fluent'

interface EditableTranslationFieldProps {
  value: any // AST Pattern object
  onChange: (value: any) => void // AST Pattern object
  disabled?: boolean
  availableVariables?: string[] // List of available variables for this message
}

export const EditableTranslationField: React.FC<EditableTranslationFieldProps> = ({
  value,
  onChange,
  disabled = false,
  availableVariables = []
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const isUpdatingRef = useRef(false)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  // Convert AST Pattern to HTML with non-editable variable badges
  const astToHTML = (pattern: any): string => {
    if (!pattern) return ''
    if (typeof pattern === 'string') return pattern

    if (pattern.type === 'Pattern' && pattern.elements) {
      let html = ''

      for (const elem of pattern.elements) {
        if (elem.type === 'TextElement') {
          html += elem.value
        } else if (elem.type === 'Placeable') {
          const expr = elem.expression

          if (expr.type === 'VariableReference') {
            // Variable: {$name}
            const varName = expr.id.name
            html += `<span contenteditable="false" data-ast-type="VariableReference" data-var-name="${varName}" class="variable-badge gba:inline-block gba:px-1 gba:bg-info-secondary gba:text-info-secondary-foreground gba:font-mono gba:text-sm gba:rounded-sm gba:cursor-default gba:select-none">${varName}</span>`
          } else if (expr.type === 'FunctionReference') {
            // Function: {DATETIME($date)}
            const funcName = expr.id.name
            const args = expr.arguments.positional
              .map((arg: any) => {
                if (arg.type === 'VariableReference') return `$${arg.id.name}`
                return arg.value || ''
              })
              .join(', ')
            const display = `${funcName}(${args})`
            html += `<span contenteditable="false" data-ast-type="FunctionReference" data-func-data="${encodeURIComponent(JSON.stringify(expr))}" class="variable-badge gba:inline-block gba:px-1 gba:bg-warning-secondary gba:text-warning-secondary-foreground gba:font-mono gba:text-sm gba:rounded-sm gba:cursor-default gba:select-none">${display}</span>`
          } else if (expr.type === 'MessageReference') {
            // Message: {-brand}
            const msgName = expr.id.name
            html += `<span contenteditable="false" data-ast-type="MessageReference" data-msg-name="${msgName}" class="variable-badge gba:inline-block gba:px-1 gba:bg-success-secondary gba:text-success-secondary-foreground gba:font-mono gba:text-sm gba:rounded-sm gba:cursor-default gba:select-none">${msgName}</span>`
          }
        }
      }

      return html
    }

    return ''
  }

  // Convert HTML back to AST Pattern (using Fluent parser for proper AST objects)
  const htmlToAST = (html: HTMLElement): any => {
    // Build FTL string from HTML
    let ftlValue = ''

    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        ftlValue += node.textContent || ''
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement

        if (element.classList.contains('variable-badge')) {
          const astType = element.getAttribute('data-ast-type')

          if (astType === 'VariableReference') {
            const varName = element.getAttribute('data-var-name') || ''
            ftlValue += `{$${varName}}`
          } else if (astType === 'FunctionReference') {
            const funcData = element.getAttribute('data-func-data') || ''
            try {
              const expr = JSON.parse(decodeURIComponent(funcData))
              // Reconstruct function call from AST
              const funcName = expr.id?.name || ''
              const args =
                expr.arguments?.positional
                  ?.map((arg: any) => {
                    if (arg.type === 'VariableReference') return `$${arg.id.name}`
                    if (arg.type === 'StringLiteral') return `"${arg.value}"`
                    if (arg.type === 'NumberLiteral') return arg.value
                    return ''
                  })
                  .join(', ') || ''
              ftlValue += `{${funcName}(${args})}`
            } catch (e) {
              console.error('[htmlToAST] Failed to parse function data:', e)
            }
          } else if (astType === 'MessageReference') {
            const msgName = element.getAttribute('data-msg-name') || ''
            ftlValue += `{${msgName}}`
          }
        } else if (element.tagName === 'BR') {
          ftlValue += '\n'
        } else {
          // Process child nodes
          element.childNodes.forEach(processNode)
        }
      }
    }

    html.childNodes.forEach(processNode)

    // Parse the FTL string to get proper AST objects
    try {
      const ftl = `temp = ${ftlValue}`
      const resource = parseFTL(ftl)
      const message = resource.body.find((e: any) => e.type === 'Message') as any
      return message?.value || { type: 'Pattern', elements: [] }
    } catch (e) {
      console.error('[htmlToAST] Failed to parse FTL:', e, ftlValue)
      // Fallback: return simple text
      return {
        type: 'Pattern',
        elements: [{ type: 'TextElement', value: ftlValue }]
      }
    }
  }

  // Initialize content
  useEffect(() => {
    if (!containerRef.current || isUpdatingRef.current) return

    const html = astToHTML(value)
    if (containerRef.current.innerHTML !== html) {
      containerRef.current.innerHTML = html
    }
  }, [value])

  const handleInput = () => {
    if (!containerRef.current || disabled) return

    isUpdatingRef.current = true
    const newPattern = htmlToAST(containerRef.current)
    onChange(newPattern)
    isUpdatingRef.current = false
  }

  // Insert a variable at cursor position
  const insertVariable = (varName: string) => {
    if (!containerRef.current) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)

    // Create variable badge HTML
    const badgeHTML = `<span contenteditable="false" data-ast-type="VariableReference" data-var-name="${varName}" class="variable-badge gba:inline-block gba:px-1 gba:bg-info-secondary gba:text-info-secondary-foreground gba:font-mono gba:text-sm gba:rounded-sm gba:cursor-default gba:select-none">${varName}</span>`

    const temp = document.createElement('div')
    temp.innerHTML = badgeHTML
    const badgeNode = temp.firstChild as Node

    range.deleteContents()
    range.insertNode(badgeNode)

    range.setStartAfter(badgeNode)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)

    handleInput()
    setIsPopoverOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!containerRef.current) return

    // Prevent deletion of badges
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)

      // Check if we're trying to delete a badge
      if (e.key === 'Backspace') {
        // Check if previous sibling is a badge
        const node = range.startContainer.previousSibling
        if (node && (node as HTMLElement).classList?.contains('variable-badge')) {
          e.preventDefault()
          return
        }
        // Check if we're inside a badge
        let parent = range.startContainer.parentElement
        while (parent && parent !== containerRef.current) {
          if (parent.classList?.contains('variable-badge')) {
            e.preventDefault()
            return
          }
          parent = parent.parentElement
        }
      } else if (e.key === 'Delete') {
        // Check if next sibling is a badge
        const node = range.startContainer.nextSibling
        if (node && (node as HTMLElement).classList?.contains('variable-badge')) {
          e.preventDefault()
          return
        }
      }

      // Check if selection contains a badge
      if (!range.collapsed) {
        const container = range.commonAncestorContainer
        const div = container.nodeType === Node.ELEMENT_NODE ? (container as HTMLElement) : container.parentElement
        if (div) {
          const badges = div.querySelectorAll('.variable-badge')
          for (let i = 0; i < badges.length; i++) {
            if (range.intersectsNode(badges[i])) {
              e.preventDefault()
              return
            }
          }
        }
      }
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()

    // Get plain text from clipboard
    const text = e.clipboardData.getData('text/plain')

    // Insert as plain text at cursor position
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    range.deleteContents()
    range.insertNode(document.createTextNode(text))

    // Move cursor to end of inserted text
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)

    handleInput()
  }

  return (
    <div className="gba:space-y-2">
      {availableVariables.length > 0 && (
        <div className="gba:flex gba:gap-2 gba:items-center">
          <span className="gba:text-xs gba:text-muted-foreground">Variables:</span>
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" disabled={disabled} className="gba:text-xs gba:h-7">
                + Insert Variable
              </Button>
            </PopoverTrigger>
            <PopoverContent className="gba:w-64 gba:p-2">
              <div className="gba:space-y-1">
                {availableVariables.map(varName => (
                  <Button
                    key={varName}
                    variant="ghost"
                    size="sm"
                    className="gba:w-full gba:justify-start gba:text-xs gba:font-mono"
                    onClick={() => insertVariable(varName)}
                  >
                    {varName}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
      <div
        ref={containerRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        suppressContentEditableWarning
        className="gba:min-h-20 gba:p-3 gba:border gba:rounded-md gba:bg-background gba:outline-none focus:gba:ring-2 focus:gba:ring-primary gba:font-mono gba:text-sm gba:leading-normal gba:whitespace-pre-wrap gba:break-words"
        spellCheck={false}
      />
    </div>
  )
}
