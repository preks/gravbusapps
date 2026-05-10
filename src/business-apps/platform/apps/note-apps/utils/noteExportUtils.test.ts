/**
 * @jest-environment jsdom
 */

import { htmlToMarkdown, htmlToPlainText } from './noteExportUtils'

describe('noteExportUtils tables', () => {
  it('converts a simple HTML table to GitHub-flavored Markdown', () => {
    const html =
      '<table class="note-editor-table">' +
      '<tbody>' +
      '<tr><td colspan="1" rowspan="1"><p>A</p></td><td colspan="1" rowspan="1"><p>B</p></td></tr>' +
      '<tr><td colspan="1" rowspan="1"><p>C</p></td><td colspan="1" rowspan="1"><p>D</p></td></tr>' +
      '</tbody></table>'

    const md = htmlToMarkdown(html)

    expect(md).toContain('| A | B |')
    expect(md).toContain('| --- | --- |')
    expect(md).toContain('| C | D |')
  })

  it('preserves table structure in plain text using tabs and newlines', () => {
    const html =
      '<table><tbody>' +
      '<tr><td><p>x</p></td><td><p>y</p></td></tr>' +
      '<tr><td><p>z</p></td><td><p>w</p></td></tr>' +
      '</tbody></table>'

    const text = htmlToPlainText(html)

    expect(text).toContain('x\ty')
    expect(text).toContain('z\tw')
  })
})
