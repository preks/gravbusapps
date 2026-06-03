import { normalizePreviewMarkdown } from './normalizePreviewMarkdown'

describe('normalizePreviewMarkdown', () => {
  it('inserts blank lines between bold field rows', () => {
    const input = [
      '**Employee:** Denis — Product — manager: Jens',
      '**Last working day:** 2026-07-30',
      '**Assigned company assets:**',
      '• iPhone 15 (Electronics)',
      '**Case id:** off-abc'
    ].join('\n')

    expect(normalizePreviewMarkdown(input)).toBe(
      [
        '**Employee:** Denis — Product — manager: Jens',
        '',
        '**Last working day:** 2026-07-30',
        '',
        '**Assigned company assets:**',
        '',
        '- iPhone 15 (Electronics)',
        '',
        '**Case id:** off-abc'
      ].join('\n')
    )
  })

  it('keeps consecutive list items without blank lines between them', () => {
    const input = ['**Assets:**', '- MacBook', '- iPhone'].join('\n')

    expect(normalizePreviewMarkdown(input)).toBe(['**Assets:**', '', '- MacBook', '- iPhone'].join('\n'))
  })

  it('returns empty-ish input unchanged', () => {
    expect(normalizePreviewMarkdown('')).toBe('')
    expect(normalizePreviewMarkdown('   ')).toBe('   ')
  })
})
