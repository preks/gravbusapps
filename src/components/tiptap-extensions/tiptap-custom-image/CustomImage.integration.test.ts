import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { CustomImage } from './CustomImage'

describe('CustomImage HTML parsing', () => {
  it('parses imported custom-image wrapper markup into an image node', () => {
    const editor = new Editor({
      extensions: [
        StarterKit.configure({
          undoRedo: false
        }),
        CustomImage.configure({
          inline: true,
          allowBase64: true
        })
      ],
      content: [
        '<p>Before</p>',
        '<p>',
        '<span data-node-type="custom-image" data-image-wrap="square" data-image-align="right">',
        '<img src="data:image/png;base64,abc123" width="120" height="80" alt="Imported image" />',
        '</span>',
        '</p>',
        '<p>After</p>'
      ].join('')
    })

    try {
      const secondParagraph = editor.getJSON().content?.[1]
      const imageNode = secondParagraph?.content?.find(node => node.type === 'image')

      expect(secondParagraph?.type).toBe('paragraph')
      expect(imageNode).toMatchObject({
        type: 'image',
        attrs: expect.objectContaining({
          src: 'data:image/png;base64,abc123',
          width: 120,
          height: 80,
          wrapMode: 'square',
          align: 'right'
        })
      })
    } finally {
      editor.destroy()
    }
  })
})
