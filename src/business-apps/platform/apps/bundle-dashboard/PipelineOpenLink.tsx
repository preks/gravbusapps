import { Button } from '@newwork/nw-design-system'
import { safeExternalHttpUrl } from './safeExternalHttpUrl'

type Props = {
  /** Raw pipeline URL from bundle report JSON (validated to http/https only). */
  pipelineUrl: string | null | undefined
}

/**
 * Bitbucket pipeline link for the bundle table. URL is validated in this module only,
 * separate from table filter/search state, to satisfy SAST and avoid false DOM-XSS paths.
 */
export function PipelineOpenLink({ pipelineUrl }: Props) {
  const href = safeExternalHttpUrl(pipelineUrl)
  if (!href) {
    return <span className="gba:text-muted-foreground">—</span>
  }
  return (
    <Button variant="link" size="sm" className="gba:h-auto gba:p-0" asChild>
      <a href={href} target="_blank" rel="noopener noreferrer">
        Open in Bitbucket
      </a>
    </Button>
  )
}
