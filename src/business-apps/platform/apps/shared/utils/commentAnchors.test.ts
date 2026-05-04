import { computePanelCommentAnchor, findInlineCommentSelection } from './commentAnchors'

describe('commentAnchors', () => {
  describe('computePanelCommentAnchor', () => {
    it('returns the current text selection as an anchor', () => {
      const editor = {
        isDestroyed: false,
        state: {
          selection: {
            from: 3,
            to: 8,
            empty: false
          },
          doc: {
            content: { size: 100 },
            textBetween: jest.fn(() => 'Hello')
          }
        }
      }

      expect(computePanelCommentAnchor(editor as any)).toEqual({
        editor,
        from: 3,
        to: 8,
        selectedText: 'Hello'
      })
    })

    it('falls back to the word under the cursor when the selection is empty', () => {
      const editor = {
        isDestroyed: false,
        state: {
          selection: {
            from: 8,
            to: 8,
            empty: true
          },
          doc: {
            content: { size: 100 },
            textBetween: jest.fn(() => 'World'),
            resolve: jest.fn(() => ({
              parent: {
                isTextblock: true,
                isLeaf: false,
                textContent: 'Hello World'
              },
              start: () => 1
            }))
          }
        }
      }

      expect(computePanelCommentAnchor(editor as any)).toEqual({
        editor,
        from: 7,
        to: 12,
        selectedText: 'World'
      })
    })
  })

  describe('findInlineCommentSelection', () => {
    it('falls back to stored positions when no inline-comment marks exist', () => {
      const selection = findInlineCommentSelection(
        {
          state: {
            doc: {
              content: { size: 200 },
              descendants: jest.fn()
            }
          }
        },
        'comment-1',
        {
          selectionStart: 14,
          selectionEnd: 28,
          selectedText: 'Saved text'
        }
      )

      expect(selection).toEqual({ from: 14, to: 28 })
    })
  })
})
