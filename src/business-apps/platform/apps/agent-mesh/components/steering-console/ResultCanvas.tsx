import { Card, CardContent, Button } from '@newwork/nw-design-system'
import { FileText, Table } from 'lucide-react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'

interface ResultCanvasProps {
  result: string | null
}

export const ResultCanvas = ({ result }: ResultCanvasProps) => {
  const handleExportText = () => {
    if (!result) return
    const blob = new Blob([result], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'agent-result.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-muted/20" data-testid="result-canvas">
      {result && (
        <div className="gba:flex gba:items-center gba:justify-end gba:px-4 gba:py-2">
          <Button
            variant="outline"
            size="sm"
            className="gba:gap-2"
            onClick={handleExportText}
            data-testid="result-canvas-export-text"
          >
            <FileText className="gba:w-4 gba:h-4" />
            Export
          </Button>
        </div>
      )}

      <div className="gba:flex-1 gba:overflow-y-auto gba:p-4">
        {!result ? (
          <div
            className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground"
            data-testid="result-canvas-empty"
          >
            <div className="gba:text-center">
              <Table className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-4 gba:opacity-50" />
              <p className="gba:text-sm">No results yet. Start a conversation to see results here.</p>
            </div>
          </div>
        ) : (
          <Card className="gba:w-full" data-testid="result-canvas-text">
            <CardContent className="gba:p-6">
              <MarkdownWithChipsRenderer content={result} variant="default" data-testid="result-canvas-markdown" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
