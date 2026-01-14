import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import { MarkdownWithChipsRenderer } from './MarkdownWithChipsRenderer'

export interface UnifiedTableRendererProps {
  columnsTitles: string[]
  rowsContents: string[][] // Cells may contain markdown links
  title?: string
  description?: string
  accessToken?: string
  showCard?: boolean // Wrap in Card component
  'data-testid'?: string
}

/**
 * Unified table renderer component that works for both:
 * - TableData type (structured data with title/description)
 * - Can be used to replace markdown table rendering
 *
 * Features:
 * - Chip support: Renders entity links in cells as chips via MarkdownWithChipsRenderer
 * - Empty cell handling: Shows "—" for empty cells
 * - Long content handling: Scrollable container for cells >200 chars
 * - Consistent styling using design system components
 * - Optional Card wrapper for title/description
 */
export const UnifiedTableRenderer: React.FC<UnifiedTableRendererProps> = ({
  columnsTitles,
  rowsContents,
  title,
  description,
  accessToken = '',
  showCard = false,
  'data-testid': testId
}) => {
  const renderCellContent = (cell: string): React.ReactNode => {
    const cellContent = String(cell || '').trim()
    const isEmpty = !cellContent || cellContent === ''
    const isLong = cellContent.length > 200

    if (isEmpty) {
      return <span className="gba:text-xs">—</span>
    }

    // Render cell content through MarkdownWithChipsRenderer for chip support
    // Use minimal wrapper to avoid extra divs
    const markdownContent = (
      <MarkdownWithChipsRenderer
        content={cellContent}
        accessToken={accessToken}
        variant="ai"
        renderHttpLinksAsChips={false}
        className="gba:text-sm"
      />
    )

    if (isLong) {
      return (
        <div
          style={{
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            maxHeight: '128px',
            overflowY: 'auto'
          }}
        >
          {markdownContent}
        </div>
      )
    }

    return <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{markdownContent}</div>
  }

  const tableContent = (
    <div className="gba:overflow-x-auto gba:rounded-lg gba:border gba:border-border gba:shadow-sm">
      <Table className="gba:w-full">
        <TableHeader>
          <TableRow>
            {columnsTitles.map((title, idx) => (
              <TableHead
                key={idx}
                className="gba:bg-muted/50 gba:font-semibold gba:text-muted-foreground gba:py-3 gba:px-4 gba:whitespace-nowrap gba:align-top gba:min-w-[120px]"
              >
                {title}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rowsContents.map((row, rowIdx) => (
            <TableRow key={rowIdx} className="gba:hover:bg-muted/30">
              {row.map((cell, cellIdx) => {
                const cellContent = String(cell || '').trim()
                const isEmpty = !cellContent || cellContent === ''

                return (
                  <TableCell
                    key={cellIdx}
                    className={`gba:py-3 gba:px-4 gba:align-top gba:min-w-[120px] ${
                      isEmpty ? 'gba:text-muted-foreground/50 gba:italic' : 'gba:text-foreground'
                    }`}
                    style={{
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      whiteSpace: 'normal',
                      maxWidth: '400px'
                    }}
                    title={cellContent.length > 200 ? cellContent : undefined}
                  >
                    {renderCellContent(cell)}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  // If showCard is true, wrap in Card with title/description (for TableData type)
  if (showCard) {
    return (
      <Card className="gba:border-2 gba:shadow-lg gba:overflow-hidden" data-testid={testId || 'unified-table-display'}>
        {title && (
          <CardHeader className="gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30 gba:border-b-2">
            <CardTitle className="gba:text-lg gba:font-bold gba:bg-gradient-to-r gba:from-ai gba:to-ai-secondary gba:bg-clip-text gba:text-transparent">
              {title}
            </CardTitle>
            {description && <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{description}</p>}
          </CardHeader>
        )}
        <CardContent className="gba:p-0">{tableContent}</CardContent>
      </Card>
    )
  }

  // Otherwise, return table with optional title/description (for renderTableData)
  return (
    <div className="gba:space-y-3" data-testid={testId || 'unified-table'}>
      {title && <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-2">{title}</h3>}
      {description && <p className="gba:text-sm gba:text-muted-foreground gba:mb-3">{description}</p>}
      {tableContent}
    </div>
  )
}

export default UnifiedTableRenderer
