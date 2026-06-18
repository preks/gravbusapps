/**
 * ExpressionEditor - Tiptap-based rich editor with inline expression pills.
 *
 * Uses @tiptap/extension-mention + @tiptap/suggestion to render expression
 * references as colored inline pills. Typing {{ opens the suggestion dropdown.
 */

import React, { useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { cn } from '@newwork/nw-design-system'
import { EditorContent, ReactNodeViewRenderer, ReactRenderer, useEditor } from '@tiptap/react'
import { mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import { ExpressionPillView } from './ExpressionPill'
import { ExpressionSuggestionList } from './ExpressionSuggestion'
import { expressionToEditorJSON, editorJSONToExpression } from './expressionSerializer'
import type { ExpressionEditorHandle, ExpressionEditorProps, ExpressionSuggestionItem } from './types/expressionTypes'

// ---- Build suggestion config for Tiptap ----

function buildExpressionSuggestion(getItems: () => ExpressionSuggestionItem[]) {
  let componentRef: ReactRenderer | null = null
  let popup: TippyInstance[] | null = null

  return {
    char: '{',
    allowSpaces: false,
    // Critical for `{{` behavior: allow the second `{` to be part of the query.
    // Otherwise the suggestion match breaks on the second brace because `{` is excluded from the query regex.
    allowToIncludeChar: true,

    items: ({ query }: { query: string }): ExpressionSuggestionItem[] => {
      // We only want to open after `{{` (second brace).
      // With `allowToIncludeChar: true`, typing `{{` yields query "{".
      if (!query.startsWith('{')) return []
      const q = query.slice(1).toLowerCase()
      return getItems()
        .filter(item => item.label.toLowerCase().includes(q) || item.expression.toLowerCase().includes(q))
        .slice(0, 12)
    },

    command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
      // We only allow the suggestion when the user typed `{{`.
      // If the suggestion range starts at the second `{`, extend by one to also replace the first `{`.
      let safeFrom = range.from
      try {
        if (typeof range?.from === 'number' && range.from > 0) {
          const prev = editor.state.doc.textBetween(range.from - 1, range.from, '\0', '\0')
          if (prev === '{') safeFrom = Math.max(0, range.from - 1)
        }
      } catch {
        // ignore
      }
      editor
        .chain()
        .focus()
        .insertContentAt({ from: safeFrom, to: range.to }, [
          {
            type: 'mention',
            attrs: {
              id: props.expression || props.id,
              label: props.label,
              mentionType: props.source,
              expression: props.expression
            }
          },
          { type: 'text', text: ' ' }
        ])
        .run()
    },

    render: () => ({
      onStart: (props: any) => {
        componentRef = new ReactRenderer(ExpressionSuggestionList, {
          props,
          editor: props.editor
        })

        if (!props.clientRect) return

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: componentRef.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          animation: 'shift-away',
          theme: 'light-border'
        })
      },

      onUpdate: (props: any) => {
        componentRef?.updateProps(props)
        if (!props.clientRect) return
        popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect })
      },

      onKeyDown: (props: any) => {
        if (props.event.key === 'Escape') {
          popup?.[0]?.hide()
          return true
        }
        return (componentRef?.ref as any)?.onKeyDown?.(props) || false
      },

      onExit: () => {
        popup?.[0]?.destroy()
        componentRef?.destroy()
      }
    })
  }
}

// ---- Main component ----

export const ExpressionEditor = React.forwardRef<ExpressionEditorHandle, ExpressionEditorProps>(
  (
    {
      value,
      onChange,
      suggestions = [],
      placeholder = 'Type {{ to insert an expression...',
      allowFreeText = true,
      multiline = false,
      singleLine = false,
      disabled = false,
      className = '',
      'data-testid': testId = 'expression-editor'
    },
    ref
  ) => {
    const suggestionsRef = useRef(suggestions)
    suggestionsRef.current = suggestions

    const suggestion = useMemo(() => buildExpressionSuggestion(() => suggestionsRef.current), [])

    const isUpdatingFromProp = useRef(false)
    const isSingleLine = singleLine === true && multiline !== true

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          codeBlock: false,
          blockquote: false,
          horizontalRule: false
        }),
        Placeholder.configure({ placeholder }),
        Mention.extend({
          atom: true,
          addAttributes() {
            return {
              id: { default: null },
              label: { default: null },
              mentionType: {
                default: 'workflow',
                parseHTML: (el: HTMLElement) => el.dataset.mentionType || 'workflow',
                renderHTML: (attrs: Record<string, string>) => ({
                  'data-mention-type': attrs.mentionType
                })
              },
              expression: {
                default: null,
                parseHTML: (el: HTMLElement) => el.dataset.expression,
                renderHTML: (attrs: Record<string, string>) => ({
                  'data-expression': attrs.expression
                })
              }
            }
          },
          renderHTML({ node, HTMLAttributes }: { node: any; HTMLAttributes: Record<string, string> }) {
            return [
              'span',
              mergeAttributes(HTMLAttributes, {
                'data-mention-type': node.attrs.mentionType,
                'data-expression': node.attrs.expression
              }),
              `{{${node.attrs.expression || node.attrs.id}}}`
            ]
          },
          addNodeView() {
            return ReactNodeViewRenderer(ExpressionPillView)
          }
        }).configure({
          suggestion
        })
      ],
      editable: !disabled,
      editorProps: {
        attributes: {
          class: cn(
            'gba:w-full gba:outline-none',
            isSingleLine && 'gba:overflow-hidden',
            !allowFreeText && 'gba:cursor-pointer'
          )
        },
        handleKeyDown: (_view, event) => {
          if (!isSingleLine) return false

          if (event.key === 'Enter') {
            // Let the suggestion popup handle Enter when open.
            const suggestionOpen = !!document.querySelector('[data-testid="expression-suggestion-list"]')
            if (suggestionOpen) return false
            event.preventDefault()
            return true
          }

          return false
        },
        handlePaste: (view, event) => {
          if (!isSingleLine) return false
          const text = event.clipboardData?.getData('text/plain')
          if (typeof text !== 'string') return false
          const sanitized = text.split(/\n+/).join(' ')
          view.dispatch(view.state.tr.insertText(sanitized))
          return true
        }
      },
      onUpdate: ({ editor: ed }) => {
        if (isUpdatingFromProp.current) return
        const json = ed.getJSON()
        const expressionString = editorJSONToExpression(json as Record<string, unknown>)
        onChange(isSingleLine ? expressionString.split(/\n+/).join(' ') : expressionString)
      }
    })

    useImperativeHandle(
      ref,
      () => ({
        insertSuggestion: (item: ExpressionSuggestionItem) => {
          if (!editor) return
          editor
            .chain()
            .focus()
            .insertContent([
              {
                type: 'mention',
                attrs: {
                  id: item.expression || item.id,
                  label: item.label,
                  mentionType: item.source,
                  expression: item.expression
                }
              },
              { type: 'text', text: ' ' }
            ])
            .run()
        }
      }),
      [editor]
    )

    // Sync editor when value prop changes externally
    useEffect(() => {
      if (!editor) return
      const currentExpression = editorJSONToExpression(editor.getJSON() as Record<string, unknown>)
      if (currentExpression !== value) {
        isUpdatingFromProp.current = true
        const content = expressionToEditorJSON(value, suggestionsRef.current)
        editor.commands.setContent(content)
        isUpdatingFromProp.current = false
      }
    }, [value, editor])

    // Update editable state
    useEffect(() => {
      if (editor) editor.setEditable(!disabled)
    }, [editor, disabled])

    return (
      <EditorContent
        editor={editor}
        data-slot="input-group-control"
        data-testid={testId}
        className={cn(
          multiline
            ? 'gba:flex-1 gba:w-full gba:min-w-0 gba:resize-none gba:rounded-none gba:border-0 gba:bg-transparent gba:px-3 gba:py-3 gba:text-base gba:shadow-none gba:outline-none gba:md:text-sm'
            : 'gba:flex-1 gba:h-full gba:w-full gba:min-w-0 gba:rounded-none gba:border-0 gba:bg-transparent gba:px-3 gba:py-1 gba:text-base gba:shadow-none gba:outline-none gba:md:text-sm',
          'gba:[&_.ProseMirror_p]:m-0',
          isSingleLine && 'gba:[&_.ProseMirror]:flex gba:[&_.ProseMirror]:items-center',
          className
        )}
      />
    )
  }
)

ExpressionEditor.displayName = 'ExpressionEditor'
