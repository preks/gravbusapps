import { Schema } from '@tiptap/pm/model'
import {
  buildHardBreakDecorations,
  createHardBreakDecorationElement,
  shouldRebuildHardBreakDecorations
} from '../paginationHardBreakDecorationController'
import {
  AddMarkStep,
  AttrStep,
  RemoveMarkStep,
  RemoveNodeMarkStep,
  ReplaceAroundStep,
  ReplaceStep
} from '@tiptap/pm/transform'

const schema = new Schema({
  nodes: {
    doc: {
      content: 'block+'
    },
    paragraph: {
      group: 'block',
      content: 'inline*',
      toDOM: () => ['p', 0]
    },
    text: {
      group: 'inline'
    },
    hardBreak: {
      inline: true,
      group: 'inline',
      selectable: false,
      toDOM: () => ['br']
    }
  },
  marks: {}
})

function createDocWithHardBreaks() {
  return schema.node('doc', null, [
    schema.node('paragraph', null, [
      schema.text('before'),
      schema.node('hardBreak'),
      schema.text('middle'),
      schema.node('hardBreak'),
      schema.text('after')
    ])
  ])
}

describe('createHardBreakDecorationElement', () => {
  it('creates the hard break marker element', () => {
    const element = createHardBreakDecorationElement()

    expect(element.tagName).toBe('SPAN')
    expect(element.classList.contains('rm-br-decoration')).toBe(true)
  })
})

describe('buildHardBreakDecorations', () => {
  it('creates one widget decoration for each hard break node', () => {
    const decorations = buildHardBreakDecorations(createDocWithHardBreaks())

    expect(decorations.find().length).toBe(2)
  })
})

describe('shouldRebuildHardBreakDecorations', () => {
  it('returns true when the document changed', () => {
    expect(
      shouldRebuildHardBreakDecorations({
        docChanged: true,
        steps: []
      })
    ).toBe(true)
  })

  it.each([
    ['replace', Object.create(ReplaceStep.prototype)],
    ['replace-around', Object.create(ReplaceAroundStep.prototype)],
    ['add-mark', Object.create(AddMarkStep.prototype)],
    ['remove-mark', Object.create(RemoveMarkStep.prototype)],
    ['remove-node-mark', Object.create(RemoveNodeMarkStep.prototype)],
    ['attr', Object.create(AttrStep.prototype)]
  ])('returns true for %s steps', (_label, step) => {
    expect(
      shouldRebuildHardBreakDecorations({
        docChanged: false,
        steps: [step]
      })
    ).toBe(true)
  })

  it('returns false when no relevant change happened', () => {
    expect(
      shouldRebuildHardBreakDecorations({
        docChanged: false,
        steps: [{}]
      })
    ).toBe(false)
  })
})
