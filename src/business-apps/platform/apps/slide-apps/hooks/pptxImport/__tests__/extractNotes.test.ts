import JSZip from 'jszip'
import { extractNotes } from '../extractNotes'
import type { SlideRelationships } from '../types'

function notesSlide(spBlocks: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
         xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      ${spBlocks.join('\n')}
    </p:spTree>
  </p:cSld>
</p:notes>`
}

function bodyShape(paragraphs: string[]): string {
  const body = paragraphs.map(text => `<a:p><a:r><a:t>${text}</a:t></a:r></a:p>`).join('')
  return `
    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="1" name="Notes Placeholder"/>
        <p:cNvSpPr/>
        <p:nvPr><p:ph type="body" idx="1"/></p:nvPr>
      </p:nvSpPr>
      <p:spPr/>
      <p:txBody>
        <a:bodyPr/>
        <a:lstStyle/>
        ${body}
      </p:txBody>
    </p:sp>
  `
}

async function zipWithNotes(path: string, body: string): Promise<JSZip> {
  const zip = new JSZip()
  zip.file(path, body)
  return zip
}

const relsPath = 'ppt/notesSlides/notesSlide1.xml'

describe('extractNotes', () => {
  it('returns empty string when notes path is missing', async () => {
    const zip = new JSZip()
    const rels: SlideRelationships = {
      images: new Map(),
      hyperlinks: new Map(),
      chartPaths: new Map()
    }
    expect(await extractNotes(zip, rels)).toBe('')
  })

  it('returns empty string when notes file is missing', async () => {
    const zip = new JSZip()
    const rels: SlideRelationships = {
      images: new Map(),
      hyperlinks: new Map(),
      chartPaths: new Map(),
      notesSlidePath: relsPath
    }
    expect(await extractNotes(zip, rels)).toBe('')
  })

  it('joins all body paragraphs with newlines', async () => {
    const zip = await zipWithNotes(relsPath, notesSlide([bodyShape(['First paragraph', 'Second paragraph'])]))
    const rels: SlideRelationships = {
      images: new Map(),
      hyperlinks: new Map(),
      chartPaths: new Map(),
      notesSlidePath: relsPath
    }
    expect(await extractNotes(zip, rels)).toBe('First paragraph\nSecond paragraph')
  })

  it('skips non-body placeholders (e.g. slide number, title)', async () => {
    const nonBody = `
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Slide Number"/>
          <p:cNvSpPr/>
          <p:nvPr><p:ph type="sldNum"/></p:nvPr>
        </p:nvSpPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p><a:r><a:t>7</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `
    const zip = await zipWithNotes(relsPath, notesSlide([nonBody, bodyShape(['Only the body shows up'])]))
    const rels: SlideRelationships = {
      images: new Map(),
      hyperlinks: new Map(),
      chartPaths: new Map(),
      notesSlidePath: relsPath
    }
    expect(await extractNotes(zip, rels)).toBe('Only the body shows up')
  })

  it('trims paragraphs and skips empty lines', async () => {
    const zip = await zipWithNotes(relsPath, notesSlide([bodyShape(['', 'Real note', ''])]))
    const rels: SlideRelationships = {
      images: new Map(),
      hyperlinks: new Map(),
      chartPaths: new Map(),
      notesSlidePath: relsPath
    }
    expect(await extractNotes(zip, rels)).toBe('Real note')
  })
})
