import React from 'react'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Button, Tabs, TabsList, TabsTrigger, TabsContent, Alert } from '@newwork/nw-design-system'
import { PlusIcon, CodeIcon, EyeIcon } from '@phosphor-icons/react'
import { HtmlEditorProps } from './types'
import { Toolbar, DraggableElement, ElementEditor, VariablePanel, ElementLibrary } from './components'
import { useHtmlEditorState, useHtmlDragDrop, useElementHandlers } from './hooks'
import { groupIntoRows } from './utils'

const DATA_TEST_ID = 'html-editor'

/**
 * HTML Editor Component with Drag & Drop
 *
 * A general-purpose HTML editor that allows:
 * - Visual editing with drag-and-drop element reordering
 * - Code view for direct HTML editing
 * - Preview of rendered HTML
 * - Template variable support
 *
 * @example
 * ```tsx
 * <HtmlEditor
 *   value={htmlContent}
 *   onChange={setHtmlContent}
 *   availableVariables={[
 *     { key: 'investmentName', label: 'Investment Name', description: 'The name of the investment' }
 *   ]}
 * />
 * ```
 */
export const HtmlEditor: React.FC<HtmlEditorProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Start creating your template...',
  minHeight = '400px',
  maxHeight = '800px',
  prefixDataTestId = DATA_TEST_ID,
  showVariableHelper = false,
  availableVariables = []
}) => {
  // State management
  const { activeTab, elements, setElements, codeValue, error, handleCodeChange, handleHtmlChange, handleTabChange } =
    useHtmlEditorState({ value, onChange })

  // Drag and drop functionality
  const { sensors, dragOverRowIndex, suggestedResizes, handleDragStart, handleDragOver, handleDragEnd } =
    useHtmlDragDrop({
      elements,
      onElementsChange: (newElements, html) => {
        setElements(newElements)
        handleHtmlChange(html)
      }
    })

  // Element manipulation handlers
  const {
    editingElement,
    isElementEditorOpen,
    setIsElementEditorOpen,
    handleAddElement,
    handleEditElement,
    handleSaveElement,
    handleDeleteElement,
    handleResizeElement,
    handleToolbarAction,
    handleInsertVariable
  } = useElementHandlers({
    elements,
    setElements,
    onHtmlChange: handleHtmlChange,
    activeTab,
    codeValue
  })

  return (
    <div className="gba:space-y-4" data-testid={prefixDataTestId}>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="gba:flex gba:items-center gba:justify-between">
          <TabsList>
            <TabsTrigger value="visual" data-testid={`${prefixDataTestId}-visual-tab`}>
              <EyeIcon className="gba:mr-2" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="code" data-testid={`${prefixDataTestId}-code-tab`}>
              <CodeIcon className="gba:mr-2" />
              Code
            </TabsTrigger>
            <TabsTrigger value="preview" data-testid={`${prefixDataTestId}-preview-tab`}>
              <EyeIcon className="gba:mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          {activeTab === 'visual' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddElement()}
              disabled={disabled}
              data-testid={`${prefixDataTestId}-add-element-button`}
              title="Add element with custom configuration"
            >
              <PlusIcon />
              Custom Element
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
            {error}
          </Alert>
        )}

        <TabsContent value="visual">
          <div className="gba:grid gba:grid-cols-12 gba:gap-4">
            {/* Element Library - Always visible on left */}
            <div className="gba:col-span-3">
              <ElementLibrary
                onSelect={handleAddElement}
                disabled={disabled}
                prefixDataTestId={`${prefixDataTestId}-library`}
              />
            </div>

            {/* Main Canvas */}
            <div className={showVariableHelper && availableVariables.length > 0 ? 'gba:col-span-6' : 'gba:col-span-9'}>
              <div
                className="gba:border gba:border-dashed gba:border-2 gba:border-input gba:rounded-md gba:p-8 gba:bg-background"
                style={{ minHeight, maxHeight, overflow: 'auto' }}
                data-testid={`${prefixDataTestId}-visual-canvas`}
                onDragOver={e => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'copy'
                }}
                onDrop={e => {
                  e.preventDefault()
                  const elementType = e.dataTransfer.getData('elementType')
                  if (elementType) {
                    handleAddElement(elementType)
                  }
                }}
              >
                {elements.length === 0 ? (
                  <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground gba:min-h-[300px]">
                    {placeholder}
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={elements.map(el => el.id)} strategy={verticalListSortingStrategy}>
                      <div className="gba:space-y-3">
                        {groupIntoRows(elements).map((row, rowIndex) => {
                          const isOverThisRow = dragOverRowIndex === rowIndex
                          const hasResizeSuggestion = isOverThisRow && Object.keys(suggestedResizes).length > 0

                          return (
                            <div
                              key={`row-${rowIndex}`}
                              className={`gba:grid gba:grid-cols-12 gba:gap-3 gba:p-2 gba:rounded gba:border gba:border-dashed gba:transition-all ${
                                isOverThisRow
                                  ? hasResizeSuggestion
                                    ? 'gba:border-warning gba:bg-warning/5'
                                    : 'gba:border-primary gba:bg-primary/5'
                                  : 'gba:border-transparent hover:gba:border-primary/30'
                              }`}
                              data-row-index={rowIndex}
                            >
                              {row.map(element => {
                                const suggestedSize = suggestedResizes[element.id]
                                const displayElement = suggestedSize ? { ...element, colSpan: suggestedSize } : element

                                return (
                                  <DraggableElement
                                    key={element.id}
                                    element={displayElement}
                                    index={elements.indexOf(element)}
                                    onEdit={handleEditElement}
                                    onDelete={handleDeleteElement}
                                    onResize={handleResizeElement}
                                    disabled={disabled}
                                    prefixDataTestId={`${prefixDataTestId}-element`}
                                  />
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>

            {/* Variable Panel - Optional on right */}
            {showVariableHelper && availableVariables.length > 0 && (
              <div className="gba:col-span-3">
                <VariablePanel
                  variables={availableVariables}
                  onInsert={handleInsertVariable}
                  disabled={disabled}
                  prefixDataTestId={`${prefixDataTestId}-variables`}
                />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="code">
          <div className="gba:grid gba:grid-cols-12 gba:gap-4">
            <div className={showVariableHelper && availableVariables.length > 0 ? 'gba:col-span-9' : 'gba:col-span-12'}>
              <Toolbar
                onAction={handleToolbarAction}
                disabled={disabled}
                prefixDataTestId={`${prefixDataTestId}-toolbar`}
              />
              <textarea
                data-testid={`${prefixDataTestId}-code-textarea`}
                value={codeValue}
                onChange={e => handleCodeChange(e.target.value)}
                disabled={disabled}
                className="gba:w-full gba:p-4 gba:border gba:border-input gba:border-t-0 gba:rounded-b-md gba:bg-background gba:text-foreground gba:font-mono gba:text-sm gba:resize-none"
                style={{ minHeight, maxHeight }}
                placeholder={placeholder}
              />
            </div>

            {showVariableHelper && availableVariables.length > 0 && (
              <div className="gba:col-span-3">
                <VariablePanel
                  variables={availableVariables}
                  onInsert={handleInsertVariable}
                  disabled={disabled}
                  prefixDataTestId={`${prefixDataTestId}-variables`}
                />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <div
            data-testid={`${prefixDataTestId}-preview`}
            className="gba:border gba:border-input gba:rounded-md gba:p-8 gba:bg-background gba:overflow-auto"
            style={{ minHeight, maxHeight }}
            dangerouslySetInnerHTML={{ __html: codeValue }}
          />
        </TabsContent>
      </Tabs>

      <ElementEditor
        element={editingElement}
        isOpen={isElementEditorOpen}
        onSave={handleSaveElement}
        onClose={() => setIsElementEditorOpen(false)}
        prefixDataTestId={`${prefixDataTestId}-element-editor`}
      />
    </div>
  )
}

export default HtmlEditor
