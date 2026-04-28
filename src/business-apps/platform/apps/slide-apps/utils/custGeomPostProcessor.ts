/**
 * Post-process a pptxgenjs-generated .pptx archive to add `<a:custGeom>`
 * entries for shapes that carry an edited `custGeomPath`.
 *
 * pptxgenjs emits `<a:prstGeom>` only; PowerPoint ignores the preset when a
 * `<a:custGeom>` sibling exists, but we also remove `<a:prstGeom>` during
 * post-processing so the XML stays tidy. Shapes are matched by the unique
 * sentinel applied to their `objectName` at export time.
 */

import JSZip from 'jszip'
import { customPathToNodes, type PathData } from '../components/shapePathGeometry'

/**
 * Sentinel prefix used to identify shapes that should receive a custGeom
 * replacement. Paired with a UUID suffix generated at export time so we
 * don't accidentally rewrite unrelated shapes.
 */
export const CUSTGEOM_MARKER_PREFIX = 'newwork-custgeom-'

/**
 * Stateful collector passed through the export flow. Each shape emitted with
 * a `custGeomPath` registers a marker and its normalised path data here; the
 * post-processor then re-enters the archive and splices in the OOXML
 * equivalent.
 */
export interface CustGeomCollector {
  add(marker: string, custGeomPath: string): void
  entries(): [string, string][]
  size(): number
}

export function createCustGeomCollector(): CustGeomCollector {
  const map = new Map<string, string>()
  return {
    add(marker, custGeomPath) {
      if (marker && custGeomPath) map.set(marker, custGeomPath)
    },
    entries() {
      return [...map.entries()]
    },
    size() {
      return map.size
    }
  }
}

/**
 * Build a short, stable marker. Uses a monotonic counter plus `Math.random`
 * rather than a full UUID to keep the generated XML compact while still
 * avoiding collisions across shapes within the same archive.
 */
let markerSeq = 0
export function createCustGeomMarker(): string {
  markerSeq += 1
  const rand = Math.floor(Math.random() * 1e6).toString(16)
  return `${CUSTGEOM_MARKER_PREFIX}${markerSeq}-${rand}`
}

// ---------------------------------------------------------------------------
// OOXML path generation
// ---------------------------------------------------------------------------

const OOXML_PATH_SIZE = 100000

function toOoxmlCoord(n: number): number {
  return Math.round(Math.max(0, Math.min(1, n)) * OOXML_PATH_SIZE)
}

function pathDataToOoxmlPath(data: PathData): string {
  // One `<a:path>` per subpath. `w` / `h` are the emu-like coordinate space
  // the child `<a:pt>` nodes reference.
  const paths: string[] = []
  for (const sub of data.subpaths) {
    if (sub.nodes.length === 0) continue
    const body: string[] = []
    const first = sub.nodes[0]
    body.push(`<a:moveTo><a:pt x="${toOoxmlCoord(first.point.x)}" y="${toOoxmlCoord(first.point.y)}"/></a:moveTo>`)
    for (let i = 1; i < sub.nodes.length; i++) {
      const prev = sub.nodes[i - 1]
      const curr = sub.nodes[i]
      if (prev.out || curr.in) {
        const c1 = prev.out ?? prev.point
        const c2 = curr.in ?? curr.point
        body.push(
          `<a:cubicBezTo>` +
            `<a:pt x="${toOoxmlCoord(c1.x)}" y="${toOoxmlCoord(c1.y)}"/>` +
            `<a:pt x="${toOoxmlCoord(c2.x)}" y="${toOoxmlCoord(c2.y)}"/>` +
            `<a:pt x="${toOoxmlCoord(curr.point.x)}" y="${toOoxmlCoord(curr.point.y)}"/>` +
            `</a:cubicBezTo>`
        )
      } else {
        body.push(`<a:lnTo><a:pt x="${toOoxmlCoord(curr.point.x)}" y="${toOoxmlCoord(curr.point.y)}"/></a:lnTo>`)
      }
    }
    if (sub.closed) {
      const last = sub.nodes[sub.nodes.length - 1]
      if (last.out || first.in) {
        const c1 = last.out ?? last.point
        const c2 = first.in ?? first.point
        body.push(
          `<a:cubicBezTo>` +
            `<a:pt x="${toOoxmlCoord(c1.x)}" y="${toOoxmlCoord(c1.y)}"/>` +
            `<a:pt x="${toOoxmlCoord(c2.x)}" y="${toOoxmlCoord(c2.y)}"/>` +
            `<a:pt x="${toOoxmlCoord(first.point.x)}" y="${toOoxmlCoord(first.point.y)}"/>` +
            `</a:cubicBezTo>`
        )
      }
      body.push(`<a:close/>`)
    }
    paths.push(`<a:path w="${OOXML_PATH_SIZE}" h="${OOXML_PATH_SIZE}">${body.join('')}</a:path>`)
  }
  return `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst>${paths.join('')}</a:pathLst></a:custGeom>`
}

/**
 * Produce the OOXML `<a:custGeom>` fragment for the supplied normalised path.
 * Exported so tests can assert the fragment shape without involving the rest
 * of the zip plumbing.
 */
export function custGeomXmlFor(custGeomPath: string): string {
  const data = customPathToNodes(custGeomPath)
  return pathDataToOoxmlPath(data)
}

// ---------------------------------------------------------------------------
// XML rewriting
// ---------------------------------------------------------------------------

// Match a <p:sp>...</p:sp> element that carries a marker object name. The
// marker appears inside <p:cNvPr name="..."/>. We use a non-greedy match and
// the RegExp flag-agnostic newline class so this survives both prettified and
// single-line pptxgen output.
const SHAPE_RE_SOURCE = String.raw`<p:sp>([\s\S]*?)</p:sp>`
const CNVPR_NAME_RE = /<p:cNvPr[^>]*\sname="([^"]+)"/

function rewriteSlideXml(xml: string, markerToCustGeomXml: Map<string, string>): string {
  const shapeRe = new RegExp(SHAPE_RE_SOURCE, 'g')
  return xml.replace(shapeRe, (whole: string) => {
    const m = CNVPR_NAME_RE.exec(whole)
    if (!m) return whole
    const name = m[1]
    const custGeomXml = markerToCustGeomXml.get(name)
    if (!custGeomXml) return whole
    // Swap <a:prstGeom>...</a:prstGeom> for <a:custGeom>...</a:custGeom>.
    // PowerPoint ignores prstGeom when custGeom is present, but removing it
    // keeps the document uncluttered and avoids authoring-time warnings.
    return whole.replace(/<a:prstGeom[\s\S]*?<\/a:prstGeom>/, custGeomXml)
  })
}

/**
 * Post-process the ArrayBuffer produced by `pptx.write({ outputType: 'arraybuffer' })`
 * to splice in `<a:custGeom>` entries for every shape whose `objectName`
 * matched a marker registered in the collector.
 *
 * Returns a Blob suitable for user download; preserves the original buffer
 * unchanged when there is nothing to rewrite so export latency stays flat.
 */
export async function applyCustGeomPostProcessing(buffer: ArrayBuffer, collector: CustGeomCollector): Promise<Blob> {
  if (collector.size() === 0) {
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
  }
  const markerToCustGeomXml = new Map<string, string>()
  for (const [marker, custGeomPath] of collector.entries()) {
    markerToCustGeomXml.set(marker, custGeomXmlFor(custGeomPath))
  }
  const zip = await JSZip.loadAsync(buffer)
  // Iterate every slide XML. `pptxgenjs` names them `ppt/slides/slideN.xml`.
  const slidePaths = Object.keys(zip.files).filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p))
  for (const p of slidePaths) {
    const entry = zip.file(p)
    if (!entry) continue
    const original = await entry.async('string')
    const rewritten = rewriteSlideXml(original, markerToCustGeomXml)
    if (rewritten !== original) zip.file(p, rewritten)
  }
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  })
}

/**
 * Trigger a download for the Blob. Split out so tests can verify the blob
 * content without touching DOM APIs.
 */
export function downloadPptxBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke after a tick so the browser has time to dispatch the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
