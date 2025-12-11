/**
 * DiffViewerModal Component
 * Displays side-by-side JSON diff of source and target templates
 */

import React, { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge
} from '@newwork/nw-design-system'
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued'
import { TemplateComparison } from '../../types/comparison'
import { FlowTemplate } from '@/business-apps/flow/apps/creator/types/template'
import { FileJson, Code, Eye } from 'lucide-react'

interface DiffViewerModalProps {
  isOpen: boolean
  onClose: () => void
  comparison: TemplateComparison
  sourceTemplate: FlowTemplate | null
  targetTemplate: FlowTemplate | null
}

export const DiffViewerModal: React.FC<DiffViewerModalProps> = ({
  isOpen,
  onClose,
  comparison,
  sourceTemplate,
  targetTemplate
}) => {
  // Format JSON with proper indentation
  const formatJSON = (obj: any): string => {
    if (!obj) return 'Template not found'

    // Remove metadata and dynamic fields for cleaner diff
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { metadata, ...cleanObj } = obj as any
    return JSON.stringify(cleanObj, null, 2)
  }

  // Get formatted JSON strings
  const sourceJSON = useMemo(() => formatJSON(sourceTemplate), [sourceTemplate])
  const targetJSON = useMemo(() => formatJSON(targetTemplate), [targetTemplate])

  // Full JSON including metadata
  const sourceFullJSON = useMemo(
    () => (sourceTemplate ? JSON.stringify(sourceTemplate, null, 2) : 'Template not found'),
    [sourceTemplate]
  )
  const targetFullJSON = useMemo(
    () => (targetTemplate ? JSON.stringify(targetTemplate, null, 2) : 'Template not found'),
    [targetTemplate]
  )

  // Calculate diff stats
  const getDiffStats = () => {
    const sourceLines = sourceJSON.split('\n').length
    const targetLines = targetJSON.split('\n').length
    const changed = Math.abs(sourceLines - targetLines)
    return { sourceLines, targetLines, changed }
  }

  const stats = getDiffStats()

  // Custom styles for diff viewer
  const diffStyles = {
    variables: {
      light: {
        diffViewerBackground: '#fff',
        diffViewerColor: '#000',
        addedBackground: '#e6ffec',
        addedColor: '#24292e',
        removedBackground: '#ffebe9',
        removedColor: '#24292e',
        wordAddedBackground: '#acf2bd',
        wordRemovedBackground: '#fdb8c0',
        addedGutterBackground: '#cdffd8',
        removedGutterBackground: '#ffdce0',
        gutterBackground: '#f6f8fa',
        gutterBackgroundDark: '#f3f4f6',
        highlightBackground: '#fffbdd',
        highlightGutterBackground: '#fff5b1'
      }
    },
    line: {
      padding: '8px 10px',
      fontSize: '13px',
      fontFamily: 'Consolas, Monaco, "Courier New", monospace'
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="gba:max-w-7xl gba:max-h-[90vh] gba:h-[90vh]">
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <FileJson className="gba:h-5 gba:w-5" />
            Template Diff: {comparison.name}
          </DialogTitle>
          <DialogDescription className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
            <span>Comparing source and target templates</span>
            <Badge variant="secondary">{comparison.status.replace(/_/g, ' ')}</Badge>
            {comparison.source && <Badge variant="outline">Source: v{comparison.source.version}</Badge>}
            {comparison.target && <Badge variant="outline">Target: v{comparison.target.version}</Badge>}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="clean" className="gba:flex gba:flex-col gba:flex-1 gba:overflow-hidden">
          <TabsList className="gba:w-full gba:justify-start">
            <TabsTrigger value="clean">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Code className="gba:h-4 gba:w-4" />
                <span>Clean Diff (No Metadata)</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="full">
              <div className="gba:flex gba:items-center gba:gap-2">
                <FileJson className="gba:h-4 gba:w-4" />
                <span>Full Diff (With Metadata)</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="preview">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Eye className="gba:h-4 gba:w-4" />
                <span>Side-by-Side Preview</span>
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Clean Diff Tab */}
          <TabsContent value="clean" className="gba:flex-1 gba:overflow-hidden">
            <div className="gba:h-full gba:overflow-auto gba:border gba:rounded-lg">
              <ReactDiffViewer
                oldValue={sourceJSON}
                newValue={targetJSON}
                splitView={true}
                compareMethod={DiffMethod.WORDS}
                styles={diffStyles}
                leftTitle={`Source: ${comparison.source ? `v${comparison.source.version}` : 'N/A'}`}
                rightTitle={`Target: ${comparison.target ? `v${comparison.target.version}` : 'N/A'}`}
                showDiffOnly={false}
              />
            </div>
          </TabsContent>

          {/* Full Diff Tab */}
          <TabsContent value="full" className="gba:flex-1 gba:overflow-hidden">
            <div className="gba:h-full gba:overflow-auto gba:border gba:rounded-lg">
              <ReactDiffViewer
                oldValue={sourceFullJSON}
                newValue={targetFullJSON}
                splitView={true}
                compareMethod={DiffMethod.WORDS}
                styles={diffStyles}
                leftTitle={`Source: ${comparison.source ? `v${comparison.source.version}` : 'N/A'} (Full)`}
                rightTitle={`Target: ${comparison.target ? `v${comparison.target.version}` : 'N/A'} (Full)`}
                showDiffOnly={false}
              />
            </div>
          </TabsContent>

          {/* Side-by-Side Preview Tab */}
          <TabsContent value="preview" className="gba:flex-1 gba:overflow-hidden">
            <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:h-full gba:overflow-hidden">
              {/* Source Preview */}
              <div className="gba:flex gba:flex-col gba:h-full gba:border gba:rounded-lg">
                <div className="gba:p-3 gba:border-b gba:bg-muted">
                  <div className="gba:font-semibold">
                    Source: {comparison.source ? `v${comparison.source.version}` : 'N/A'}
                  </div>
                  {comparison.source && (
                    <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                      {comparison.source.isDraft && (
                        <Badge variant="outline" className="gba:mr-2">
                          Draft
                        </Badge>
                      )}
                      {stats.sourceLines} lines
                    </div>
                  )}
                </div>
                <div className="gba:flex-1 gba:overflow-auto gba:p-4 gba:bg-muted/30">
                  <pre className="gba:text-xs gba:font-mono">{sourceJSON}</pre>
                </div>
              </div>

              {/* Target Preview */}
              <div className="gba:flex gba:flex-col gba:h-full gba:border gba:rounded-lg">
                <div className="gba:p-3 gba:border-b gba:bg-muted">
                  <div className="gba:font-semibold">
                    Target: {comparison.target ? `v${comparison.target.version}` : 'N/A'}
                  </div>
                  {comparison.target && (
                    <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                      {comparison.target.isDraft && (
                        <Badge variant="outline" className="gba:mr-2">
                          Draft
                        </Badge>
                      )}
                      {stats.targetLines} lines
                    </div>
                  )}
                </div>
                <div className="gba:flex-1 gba:overflow-auto gba:p-4 gba:bg-muted/30">
                  <pre className="gba:text-xs gba:font-mono">{targetJSON}</pre>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gba:flex gba:justify-between gba:items-center">
          <div className="gba:text-sm gba:text-muted-foreground">
            {comparison.versionGap && (
              <span>
                Version gap: {comparison.versionGap} {comparison.versionGap === 1 ? 'version' : 'versions'}
              </span>
            )}
          </div>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
