/**
 * Proper .docx (Office Open XML) export using JSZip.
 * Produces a real ZIP-based .docx that Word, LibreOffice, and mammoth can parse.
 */

import JSZip from 'jszip'
import { sanitizeHtmlForExport } from './exportUtils'

function escapeXml(text: string): string {
  return (text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

interface EmbeddedImage {
  rId: string
  fileName: string
  data: Uint8Array
  widthEmu: number
  heightEmu: number
}

interface DocxBuildContext {
  images: EmbeddedImage[]
  hyperlinks: { rId: string; url: string }[]
  nextImageId: number
  nextHyperlinkId: number
}

function newContext(): DocxBuildContext {
  return { images: [], hyperlinks: [], nextImageId: 1, nextHyperlinkId: 1 }
}

const PX_TO_EMU = 9525
const DEFAULT_IMG_WIDTH = 400
const DEFAULT_IMG_HEIGHT = 300

function extractDataUrlParts(dataUrl: string): { mime: string; base64: string; ext: string } | null {
  const m = dataUrl.match(/^data:(image\/(\w+));base64,(.+)$/i)
  if (!m) return null
  return { mime: m[1], ext: m[2] === 'jpeg' ? 'jpg' : m[2], base64: m[3] }
}

function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

function registerImage(ctx: DocxBuildContext, src: string, width: number, height: number): EmbeddedImage | null {
  const parts = extractDataUrlParts(src)
  if (!parts) return null
  const id = ctx.nextImageId++
  const img: EmbeddedImage = {
    rId: `rIdImg${id}`,
    fileName: `image${id}.${parts.ext}`,
    data: base64ToUint8Array(parts.base64),
    widthEmu: (width || DEFAULT_IMG_WIDTH) * PX_TO_EMU,
    heightEmu: (height || DEFAULT_IMG_HEIGHT) * PX_TO_EMU
  }
  ctx.images.push(img)
  return img
}

function registerHyperlink(ctx: DocxBuildContext, url: string): string {
  const id = ctx.nextHyperlinkId++
  const rId = `rIdLink${id}`
  ctx.hyperlinks.push({ rId, url })
  return rId
}

function imageDrawingXml(img: EmbeddedImage, docPrId: number): string {
  return (
    `<w:drawing>` +
    `<wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${img.widthEmu}" cy="${img.heightEmu}"/>` +
    `<wp:docPr id="${docPrId}" name="${escapeXml(img.fileName)}"/>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:nvPicPr><pic:cNvPr id="0" name="${escapeXml(img.fileName)}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${img.rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${img.widthEmu}" cy="${img.heightEmu}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`
  )
}

function wrapRun(text: string, props?: string): string {
  const rPr = props ? `<w:rPr>${props}</w:rPr>` : ''
  return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`
}

function convertInline(el: HTMLElement, ctx: DocxBuildContext, inheritProps?: string): string {
  let result = ''
  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i]
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ''
      if (text) result += wrapRun(text, inheritProps)
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const child = node as HTMLElement
      const tag = child.tagName.toLowerCase()
      switch (tag) {
        case 'strong':
        case 'b':
          result += convertInline(child, ctx, (inheritProps || '') + '<w:b/>')
          break
        case 'em':
        case 'i':
          result += convertInline(child, ctx, (inheritProps || '') + '<w:i/>')
          break
        case 'u':
          result += convertInline(child, ctx, (inheritProps || '') + '<w:u w:val="single"/>')
          break
        case 's':
        case 'del':
        case 'strike':
          result += convertInline(child, ctx, (inheritProps || '') + '<w:strike/>')
          break
        case 'a': {
          const href = child.getAttribute('href') || ''
          if (href) {
            const rId = registerHyperlink(ctx, href)
            const linkProps =
              (inheritProps || '') + '<w:rStyle w:val="Hyperlink"/><w:color w:val="0066CC"/><w:u w:val="single"/>'
            result += `<w:hyperlink r:id="${rId}">${convertInline(child, ctx, linkProps)}</w:hyperlink>`
          } else {
            result += convertInline(child, ctx, inheritProps)
          }
          break
        }
        case 'br':
          result += '<w:r><w:br/></w:r>'
          break
        case 'img': {
          const src = child.getAttribute('src') || ''
          const w = parseInt(child.getAttribute('width') || '0', 10) || DEFAULT_IMG_WIDTH
          const h = parseInt(child.getAttribute('height') || '0', 10) || DEFAULT_IMG_HEIGHT
          const img = registerImage(ctx, src, w, h)
          if (img)
            result += `<w:r><w:drawing>${imageDrawingXml(img, ctx.images.length).replace('<w:drawing>', '').replace('</w:drawing>', '')}</w:drawing></w:r>`
          break
        }
        case 'code':
          result += convertInline(
            child,
            ctx,
            (inheritProps || '') + '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="20"/>'
          )
          break
        default:
          result += convertInline(child, ctx, inheritProps)
          break
      }
    }
  }
  return result
}

function convertBlock(parent: Node, parts: string[], ctx: DocxBuildContext): void {
  for (let i = 0; i < parent.childNodes.length; i++) {
    const node = parent.childNodes[i]
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (text) parts.push(`<w:p>${wrapRun(text)}</w:p>`)
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      const tag = el.tagName.toLowerCase()
      switch (tag) {
        case 'p':
          parts.push(`<w:p>${convertInline(el, ctx)}</w:p>`)
          break
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6': {
          const level = tag.charAt(1)
          parts.push(`<w:p><w:pPr><w:pStyle w:val="Heading${level}"/></w:pPr>${convertInline(el, ctx)}</w:p>`)
          break
        }
        case 'ul':
          convertList(el, parts, ctx, false, 0)
          break
        case 'ol':
          convertList(el, parts, ctx, true, 0)
          break
        case 'table':
          convertTable(el, parts, ctx)
          break
        case 'blockquote': {
          const bqPs = el.querySelectorAll('p')
          if (bqPs.length > 0) {
            bqPs.forEach(p => {
              parts.push(
                `<w:p><w:pPr><w:ind w:left="720"/></w:pPr>${convertInline(p as HTMLElement, ctx, '<w:i/><w:color w:val="555555"/>')}</w:p>`
              )
            })
          } else {
            parts.push(
              `<w:p><w:pPr><w:ind w:left="720"/></w:pPr>${convertInline(el, ctx, '<w:i/><w:color w:val="555555"/>')}</w:p>`
            )
          }
          break
        }
        case 'pre': {
          const codeEl = el.querySelector('code')
          const text = (codeEl || el).textContent || ''
          text.split('\n').forEach(line => {
            parts.push(
              `<w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="4" w:space="1" w:color="E0E0E0"/><w:bottom w:val="single" w:sz="4" w:space="1" w:color="E0E0E0"/><w:left w:val="single" w:sz="4" w:space="4" w:color="E0E0E0"/><w:right w:val="single" w:sz="4" w:space="4" w:color="E0E0E0"/></w:pBdr><w:shd w:val="clear" w:fill="F5F5F5"/></w:pPr>${wrapRun(line, '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="20"/>')}</w:p>`
            )
          })
          break
        }
        case 'hr':
          parts.push(
            '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr></w:pPr></w:p>'
          )
          break
        case 'br':
          parts.push('<w:p/>')
          break
        case 'div':
          if (el.hasAttribute('data-page-break')) {
            parts.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
          } else {
            convertBlock(el, parts, ctx)
          }
          break
        default:
          if (el.textContent?.trim()) {
            parts.push(`<w:p>${convertInline(el, ctx)}</w:p>`)
          }
          break
      }
    }
  }
}

function convertList(
  listEl: HTMLElement,
  parts: string[],
  ctx: DocxBuildContext,
  ordered: boolean,
  level: number
): void {
  const numId = ordered ? '2' : '1'
  const items = listEl.querySelectorAll(':scope > li')
  items.forEach(li => {
    const pPr = `<w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="${level}"/><w:numId w:val="${numId}"/></w:numPr></w:pPr>`
    const paragraphs = li.querySelectorAll(':scope > p')
    if (paragraphs.length > 0) {
      paragraphs.forEach((p, idx) => {
        parts.push(`<w:p>${idx === 0 ? pPr : ''}${convertInline(p as HTMLElement, ctx)}</w:p>`)
      })
    } else {
      const inlineContent = convertInline(li as HTMLElement, ctx)
      parts.push(`<w:p>${pPr}${inlineContent}</w:p>`)
    }
    const nestedUl = li.querySelectorAll(':scope > ul')
    nestedUl.forEach(nested => convertList(nested as HTMLElement, parts, ctx, false, level + 1))
    const nestedOl = li.querySelectorAll(':scope > ol')
    nestedOl.forEach(nested => convertList(nested as HTMLElement, parts, ctx, true, level + 1))
  })
}

function convertTable(tableEl: HTMLElement, parts: string[], ctx: DocxBuildContext): void {
  const borderXml =
    '<w:top w:val="single" w:sz="4" w:space="0" w:color="333333"/>' +
    '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="333333"/>' +
    '<w:left w:val="single" w:sz="4" w:space="0" w:color="333333"/>' +
    '<w:right w:val="single" w:sz="4" w:space="0" w:color="333333"/>' +
    '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="333333"/>' +
    '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="333333"/>'
  parts.push(`<w:tbl><w:tblPr><w:tblBorders>${borderXml}</w:tblBorders><w:tblW w:w="5000" w:type="pct"/></w:tblPr>`)
  const rows = tableEl.querySelectorAll('tr')
  rows.forEach(row => {
    parts.push('<w:tr>')
    const cells = row.querySelectorAll('td, th')
    cells.forEach(cell => {
      const isHeader = cell.tagName.toLowerCase() === 'th'
      const shd = isHeader ? '<w:shd w:val="clear" w:fill="F0F0F0"/>' : ''
      const rProps = isHeader ? '<w:b/>' : ''
      parts.push(`<w:tc><w:tcPr>${shd}</w:tcPr><w:p>${convertInline(cell as HTMLElement, ctx, rProps)}</w:p></w:tc>`)
    })
    parts.push('</w:tr>')
  })
  parts.push('</w:tbl>')
}

function buildDocumentXml(bodyXml: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  mc:Ignorable="w14 wp14">
<w:body>
${bodyXml}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
</w:body>
</w:document>`
}

function buildNumberingXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="\u2022"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>
<w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="\u25E6"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>
<w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`
}

function buildStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="48"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="36"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:pPr><w:spacing w:before="160" w:after="80"/></w:pPr><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading5"><w:name w:val="heading 5"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading6"><w:name w:val="heading 6"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:pPr><w:ind w:left="720"/></w:pPr></w:style>
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0066CC"/><w:u w:val="single"/></w:rPr></w:style>
</w:styles>`
}

function buildRelsXml(ctx: DocxBuildContext): string {
  const imageRels = ctx.images
    .map(
      img =>
        `<Relationship Id="${img.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${img.fileName}"/>`
    )
    .join('\n')
  const linkRels = ctx.hyperlinks
    .map(
      lnk =>
        `<Relationship Id="${lnk.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escapeXml(lnk.url)}" TargetMode="External"/>`
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
${imageRels}
${linkRels}
</Relationships>`
}

function buildContentTypesXml(ctx: DocxBuildContext): string {
  const exts = new Set(ctx.images.map(img => img.fileName.split('.').pop()!))
  const extTypes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml'
  }
  const defaults = Array.from(exts)
    .map(ext => `<Default Extension="${ext}" ContentType="${extTypes[ext] || 'application/octet-stream'}"/>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
${defaults}
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`
}

/**
 * Build a proper .docx (Office Open XML) Blob from sanitized HTML content.
 */
export async function buildDocxBlob(title: string, htmlContent: string): Promise<Blob> {
  const safeHtml = sanitizeHtmlForExport(htmlContent, { preserveBlockSpacing: true, allowDataUriInImg: true })
  const ctx = newContext()

  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = safeHtml
  const bodyParts: string[] = []
  convertBlock(tempDiv, bodyParts, ctx)
  if (bodyParts.length === 0) bodyParts.push('<w:p/>')

  const zip = new JSZip()
  zip.file('[Content_Types].xml', buildContentTypesXml(ctx))
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  )
  zip.file('word/document.xml', buildDocumentXml(bodyParts.join('\n')))
  zip.file('word/styles.xml', buildStylesXml())
  zip.file('word/numbering.xml', buildNumberingXml())
  zip.file('word/_rels/document.xml.rels', buildRelsXml(ctx))

  for (const img of ctx.images) {
    zip.file(`word/media/${img.fileName}`, img.data)
  }

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })
}

/**
 * Sanitize filename for download.
 */
export function sanitizeDocxFilename(name: string): string {
  return (
    name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 200) || 'document'
  )
}
