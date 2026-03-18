import Image from '@tiptap/extension-image'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeSelection } from '@tiptap/pm/state'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CustomImageView } from './CustomImageView'
import {
  appendClassName,
  CUSTOM_IMAGE_FIGURE_CLASS,
  CUSTOM_IMAGE_TAG,
  getFigureDataAttributes,
  getImageFigureAttributesFromElement,
  normalizeImageAlign,
  normalizeImageAnchorMode,
  normalizeImageDisplay,
  normalizeImageSizeReference,
  normalizeImageSizeUnit,
  normalizeImageWrapMode,
  normalizeNullableBoolean,
  normalizeNullableNumber
} from './styleUtils'
import type { CustomImageAttributes, CustomImageOptions, SetImageLayoutOptions } from './types'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customImage: {
      setImageSize: (width: number | null, height: number | null) => ReturnType
      setImageAlign: (align: NonNullable<CustomImageAttributes['align']>) => ReturnType
      setImageCaption: (caption: string | null) => ReturnType
      setImageAltText: (alt: string | null) => ReturnType
      setImageWrapMode: (wrapMode: NonNullable<CustomImageAttributes['wrapMode']>) => ReturnType
      setImageLayout: (options: SetImageLayoutOptions) => ReturnType
      replaceImage: (attrs: Partial<Pick<CustomImageAttributes, 'src' | 'alt' | 'title'>>) => ReturnType
      removeSelectedImage: () => ReturnType
    }
  }
}

function findCurrentImage(state: EditorState, nodeName: string): { node: ProseMirrorNode; pos: number } | null {
  const selectedNode = state.selection instanceof NodeSelection ? state.selection.node : null
  if (selectedNode?.type?.name === nodeName) {
    return {
      node: selectedNode,
      pos: state.selection.from
    }
  }

  const { $from } = state.selection
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth)
    if (node.type.name === nodeName) {
      return {
        node,
        pos: $from.before(depth)
      }
    }
  }

  return null
}

function updateCurrentImage(state: EditorState, tr: Transaction, nodeName: string, attrs: Record<string, unknown>) {
  const image = findCurrentImage(state, nodeName)
  if (!image) return false

  tr.setNodeMarkup(image.pos, undefined, {
    ...image.node.attrs,
    ...attrs
  })

  return true
}

function pickDefined<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined))
}

export const CustomImage = Image.extend<CustomImageOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      getAccessToken: () => '',
      isProtectedSrc: () => false,
      resolveProtectedSrc: undefined,
      minSize: 50,
      defaultAlign: 'left',
      defaultWrapMode: 'inline',
      defaultAnchorMode: 'inline',
      defaultDisplay: 'inline',
      defaultDistance: 0
    }
  },

  draggable: false,

  parseHTML() {
    const defaults = {
      align: this.options.defaultAlign,
      wrapMode: this.options.defaultWrapMode,
      anchorMode: this.options.defaultAnchorMode,
      display: this.options.defaultDisplay,
      distance: this.options.defaultDistance
    }

    return [
      {
        tag: `figure[data-node-type="${CUSTOM_IMAGE_TAG}"]`,
        getAttrs: element => {
          const attrs = getImageFigureAttributesFromElement(element, defaults)
          return attrs.src ? attrs : false
        }
      },
      {
        tag: 'img[src]',
        getAttrs: element => {
          if (element.parentElement?.closest(`figure[data-node-type="${CUSTOM_IMAGE_TAG}"]`)) {
            return false
          }

          const attrs = getImageFigureAttributesFromElement(element, defaults)
          return attrs.src ? attrs : false
        }
      }
    ]
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element =>
          normalizeNullableNumber(
            getImageFigureAttributesFromElement(element, {
              align: this.options.defaultAlign,
              wrapMode: this.options.defaultWrapMode,
              anchorMode: this.options.defaultAnchorMode,
              display: this.options.defaultDisplay,
              distance: this.options.defaultDistance
            }).width
          ),
        renderHTML: attributes => {
          const width = normalizeNullableNumber(attributes.width)
          return width == null ? {} : { width: String(Math.round(width)) }
        }
      },
      height: {
        default: null,
        parseHTML: element =>
          normalizeNullableNumber(
            getImageFigureAttributesFromElement(element, {
              align: this.options.defaultAlign,
              wrapMode: this.options.defaultWrapMode,
              anchorMode: this.options.defaultAnchorMode,
              display: this.options.defaultDisplay,
              distance: this.options.defaultDistance
            }).height
          ),
        renderHTML: attributes => {
          const height = normalizeNullableNumber(attributes.height)
          return height == null ? {} : { height: String(Math.round(height)) }
        }
      },
      originalWidth: {
        default: null,
        parseHTML: element =>
          normalizeNullableNumber(
            getImageFigureAttributesFromElement(element, {
              align: this.options.defaultAlign,
              wrapMode: this.options.defaultWrapMode,
              anchorMode: this.options.defaultAnchorMode,
              display: this.options.defaultDisplay,
              distance: this.options.defaultDistance
            }).originalWidth
          ),
        renderHTML: attributes => {
          const originalWidth = normalizeNullableNumber(attributes.originalWidth)
          return originalWidth == null ? {} : { 'data-image-original-width': String(Math.round(originalWidth)) }
        }
      },
      originalHeight: {
        default: null,
        parseHTML: element =>
          normalizeNullableNumber(
            getImageFigureAttributesFromElement(element, {
              align: this.options.defaultAlign,
              wrapMode: this.options.defaultWrapMode,
              anchorMode: this.options.defaultAnchorMode,
              display: this.options.defaultDisplay,
              distance: this.options.defaultDistance
            }).originalHeight
          ),
        renderHTML: attributes => {
          const originalHeight = normalizeNullableNumber(attributes.originalHeight)
          return originalHeight == null ? {} : { 'data-image-original-height': String(Math.round(originalHeight)) }
        }
      },
      widthUnit: {
        default: 'px',
        parseHTML: element =>
          getImageFigureAttributesFromElement(element, {
            align: this.options.defaultAlign,
            wrapMode: this.options.defaultWrapMode,
            anchorMode: this.options.defaultAnchorMode,
            display: this.options.defaultDisplay,
            distance: this.options.defaultDistance
          }).widthUnit,
        renderHTML: attributes => ({
          'data-image-width-unit': normalizeImageSizeUnit(attributes.widthUnit, 'px')
        })
      },
      heightUnit: {
        default: 'px',
        parseHTML: element =>
          getImageFigureAttributesFromElement(element, {
            align: this.options.defaultAlign,
            wrapMode: this.options.defaultWrapMode,
            anchorMode: this.options.defaultAnchorMode,
            display: this.options.defaultDisplay,
            distance: this.options.defaultDistance
          }).heightUnit,
        renderHTML: attributes => ({
          'data-image-height-unit': normalizeImageSizeUnit(attributes.heightUnit, 'px')
        })
      },
      widthPercent: {
        default: null,
        parseHTML: element =>
          normalizeNullableNumber(
            getImageFigureAttributesFromElement(element, {
              align: this.options.defaultAlign,
              wrapMode: this.options.defaultWrapMode,
              anchorMode: this.options.defaultAnchorMode,
              display: this.options.defaultDisplay,
              distance: this.options.defaultDistance
            }).widthPercent
          ),
        renderHTML: attributes => {
          const widthPercent = normalizeNullableNumber(attributes.widthPercent)
          return widthPercent == null ? {} : { 'data-image-width-percent': String(widthPercent) }
        }
      },
      heightPercent: {
        default: null,
        parseHTML: element =>
          normalizeNullableNumber(
            getImageFigureAttributesFromElement(element, {
              align: this.options.defaultAlign,
              wrapMode: this.options.defaultWrapMode,
              anchorMode: this.options.defaultAnchorMode,
              display: this.options.defaultDisplay,
              distance: this.options.defaultDistance
            }).heightPercent
          ),
        renderHTML: attributes => {
          const heightPercent = normalizeNullableNumber(attributes.heightPercent)
          return heightPercent == null ? {} : { 'data-image-height-percent': String(heightPercent) }
        }
      },
      widthRelativeTo: {
        default: 'page',
        parseHTML: element =>
          getImageFigureAttributesFromElement(element, {
            align: this.options.defaultAlign,
            wrapMode: this.options.defaultWrapMode,
            anchorMode: this.options.defaultAnchorMode,
            display: this.options.defaultDisplay,
            distance: this.options.defaultDistance
          }).widthRelativeTo,
        renderHTML: attributes => ({
          'data-image-width-relative-to': normalizeImageSizeReference(attributes.widthRelativeTo, 'page')
        })
      },
      heightRelativeTo: {
        default: 'page',
        parseHTML: element =>
          getImageFigureAttributesFromElement(element, {
            align: this.options.defaultAlign,
            wrapMode: this.options.defaultWrapMode,
            anchorMode: this.options.defaultAnchorMode,
            display: this.options.defaultDisplay,
            distance: this.options.defaultDistance
          }).heightRelativeTo,
        renderHTML: attributes => ({
          'data-image-height-relative-to': normalizeImageSizeReference(attributes.heightRelativeTo, 'page')
        })
      },
      scaleWidthPercent: {
        default: 100,
        parseHTML: element =>
          normalizeNullableNumber(
            getImageFigureAttributesFromElement(element, {
              align: this.options.defaultAlign,
              wrapMode: this.options.defaultWrapMode,
              anchorMode: this.options.defaultAnchorMode,
              display: this.options.defaultDisplay,
              distance: this.options.defaultDistance
            }).scaleWidthPercent,
            100
          ),
        renderHTML: attributes => ({
          'data-image-scale-width-percent': String(normalizeNullableNumber(attributes.scaleWidthPercent, 100) ?? 100)
        })
      },
      scaleHeightPercent: {
        default: 100,
        parseHTML: element =>
          normalizeNullableNumber(
            getImageFigureAttributesFromElement(element, {
              align: this.options.defaultAlign,
              wrapMode: this.options.defaultWrapMode,
              anchorMode: this.options.defaultAnchorMode,
              display: this.options.defaultDisplay,
              distance: this.options.defaultDistance
            }).scaleHeightPercent,
            100
          ),
        renderHTML: attributes => ({
          'data-image-scale-height-percent': String(normalizeNullableNumber(attributes.scaleHeightPercent, 100) ?? 100)
        })
      },
      rotation: {
        default: 0,
        parseHTML: element =>
          normalizeNullableNumber(
            getImageFigureAttributesFromElement(element, {
              align: this.options.defaultAlign,
              wrapMode: this.options.defaultWrapMode,
              anchorMode: this.options.defaultAnchorMode,
              display: this.options.defaultDisplay,
              distance: this.options.defaultDistance
            }).rotation,
            0
          ),
        renderHTML: attributes => ({
          'data-image-rotation': String(normalizeNullableNumber(attributes.rotation, 0) ?? 0)
        })
      },
      align: {
        default: this.options.defaultAlign,
        parseHTML: element =>
          getImageFigureAttributesFromElement(element, {
            align: this.options.defaultAlign,
            wrapMode: this.options.defaultWrapMode,
            anchorMode: this.options.defaultAnchorMode,
            display: this.options.defaultDisplay,
            distance: this.options.defaultDistance
          }).align,
        renderHTML: attributes => ({
          'data-image-align': normalizeImageAlign(attributes.align, this.options.defaultAlign)
        })
      },
      caption: {
        default: null,
        parseHTML: element =>
          getImageFigureAttributesFromElement(element, {
            align: this.options.defaultAlign,
            wrapMode: this.options.defaultWrapMode,
            anchorMode: this.options.defaultAnchorMode,
            display: this.options.defaultDisplay,
            distance: this.options.defaultDistance
          }).caption,
        renderHTML: attributes => (attributes.caption ? { 'data-image-caption': String(attributes.caption) } : {})
      },
      display: {
        default: this.options.defaultDisplay,
        parseHTML: element =>
          getImageFigureAttributesFromElement(element, {
            align: this.options.defaultAlign,
            wrapMode: this.options.defaultWrapMode,
            anchorMode: this.options.defaultAnchorMode,
            display: this.options.defaultDisplay,
            distance: this.options.defaultDistance
          }).display,
        renderHTML: attributes => ({
          'data-image-display': normalizeImageDisplay(attributes.display, this.options.defaultDisplay)
        })
      },
      wrapMode: {
        default: this.options.defaultWrapMode,
        parseHTML: element =>
          getImageFigureAttributesFromElement(element, {
            align: this.options.defaultAlign,
            wrapMode: this.options.defaultWrapMode,
            anchorMode: this.options.defaultAnchorMode,
            display: this.options.defaultDisplay,
            distance: this.options.defaultDistance
          }).wrapMode,
        renderHTML: attributes => ({
          'data-image-wrap': normalizeImageWrapMode(attributes.wrapMode, this.options.defaultWrapMode)
        })
      },
      anchorMode: {
        default: this.options.defaultAnchorMode,
        parseHTML: element =>
          getImageFigureAttributesFromElement(element, {
            align: this.options.defaultAlign,
            wrapMode: this.options.defaultWrapMode,
            anchorMode: this.options.defaultAnchorMode,
            display: this.options.defaultDisplay,
            distance: this.options.defaultDistance
          }).anchorMode,
        renderHTML: attributes => ({
          'data-image-anchor': normalizeImageAnchorMode(attributes.anchorMode, this.options.defaultAnchorMode)
        })
      },
      lockAspectRatio: {
        default: true,
        parseHTML: element =>
          getImageFigureAttributesFromElement(element, {
            align: this.options.defaultAlign,
            wrapMode: this.options.defaultWrapMode,
            anchorMode: this.options.defaultAnchorMode,
            display: this.options.defaultDisplay,
            distance: this.options.defaultDistance
          }).lockAspectRatio,
        renderHTML: attributes => ({
          'data-image-lock-ratio': String(normalizeNullableBoolean(attributes.lockAspectRatio, true) ?? true)
        })
      },
      distanceTop: {
        default: this.options.defaultDistance,
        parseHTML: element =>
          getImageFigureAttributesFromElement(element, {
            align: this.options.defaultAlign,
            wrapMode: this.options.defaultWrapMode,
            anchorMode: this.options.defaultAnchorMode,
            display: this.options.defaultDisplay,
            distance: this.options.defaultDistance
          }).distanceTop,
        renderHTML: attributes => ({
          'data-image-distance-top': String(
            normalizeNullableNumber(attributes.distanceTop, this.options.defaultDistance) ??
              this.options.defaultDistance
          )
        })
      },
      distanceRight: {
        default: this.options.defaultDistance,
        parseHTML: element =>
          getImageFigureAttributesFromElement(element, {
            align: this.options.defaultAlign,
            wrapMode: this.options.defaultWrapMode,
            anchorMode: this.options.defaultAnchorMode,
            display: this.options.defaultDisplay,
            distance: this.options.defaultDistance
          }).distanceRight,
        renderHTML: attributes => ({
          'data-image-distance-right': String(
            normalizeNullableNumber(attributes.distanceRight, this.options.defaultDistance) ??
              this.options.defaultDistance
          )
        })
      },
      distanceBottom: {
        default: this.options.defaultDistance,
        parseHTML: element =>
          getImageFigureAttributesFromElement(element, {
            align: this.options.defaultAlign,
            wrapMode: this.options.defaultWrapMode,
            anchorMode: this.options.defaultAnchorMode,
            display: this.options.defaultDisplay,
            distance: this.options.defaultDistance
          }).distanceBottom,
        renderHTML: attributes => ({
          'data-image-distance-bottom': String(
            normalizeNullableNumber(attributes.distanceBottom, this.options.defaultDistance) ??
              this.options.defaultDistance
          )
        })
      },
      distanceLeft: {
        default: this.options.defaultDistance,
        parseHTML: element =>
          getImageFigureAttributesFromElement(element, {
            align: this.options.defaultAlign,
            wrapMode: this.options.defaultWrapMode,
            anchorMode: this.options.defaultAnchorMode,
            display: this.options.defaultDisplay,
            distance: this.options.defaultDistance
          }).distanceLeft,
        renderHTML: attributes => ({
          'data-image-distance-left': String(
            normalizeNullableNumber(attributes.distanceLeft, this.options.defaultDistance) ??
              this.options.defaultDistance
          )
        })
      },
      offsetX: {
        default: 0,
        parseHTML: element =>
          getImageFigureAttributesFromElement(element, {
            align: this.options.defaultAlign,
            wrapMode: this.options.defaultWrapMode,
            anchorMode: this.options.defaultAnchorMode,
            display: this.options.defaultDisplay,
            distance: this.options.defaultDistance
          }).offsetX,
        renderHTML: attributes => ({
          'data-image-offset-x': String(normalizeNullableNumber(attributes.offsetX, 0) ?? 0)
        })
      },
      offsetY: {
        default: 0,
        parseHTML: element =>
          getImageFigureAttributesFromElement(element, {
            align: this.options.defaultAlign,
            wrapMode: this.options.defaultWrapMode,
            anchorMode: this.options.defaultAnchorMode,
            display: this.options.defaultDisplay,
            distance: this.options.defaultDistance
          }).offsetY,
        renderHTML: attributes => ({
          'data-image-offset-y': String(normalizeNullableNumber(attributes.offsetY, 0) ?? 0)
        })
      },
      allowOverlap: {
        default: false,
        parseHTML: element =>
          getImageFigureAttributesFromElement(element, {
            align: this.options.defaultAlign,
            wrapMode: this.options.defaultWrapMode,
            anchorMode: this.options.defaultAnchorMode,
            display: this.options.defaultDisplay,
            distance: this.options.defaultDistance
          }).allowOverlap,
        renderHTML: attributes => ({
          'data-image-allow-overlap': String(normalizeNullableBoolean(attributes.allowOverlap, false) ?? false)
        })
      },
      zIndex: {
        default: 1,
        parseHTML: element =>
          getImageFigureAttributesFromElement(element, {
            align: this.options.defaultAlign,
            wrapMode: this.options.defaultWrapMode,
            anchorMode: this.options.defaultAnchorMode,
            display: this.options.defaultDisplay,
            distance: this.options.defaultDistance
          }).zIndex,
        renderHTML: attributes => ({ 'data-image-z-index': String(normalizeNullableNumber(attributes.zIndex, 1) ?? 1) })
      }
    }
  },

  renderHTML({ node, HTMLAttributes }) {
    const imageAttributes = node.attrs as CustomImageAttributes
    const figureAttrs = getFigureDataAttributes(imageAttributes)
    const figureClass = appendClassName(CUSTOM_IMAGE_FIGURE_CLASS, figureAttrs.class)
    const imageClass = appendClassName('editor-image', HTMLAttributes.class)
    const width = normalizeNullableNumber(imageAttributes.width ?? HTMLAttributes.width)
    const height = normalizeNullableNumber(imageAttributes.height ?? HTMLAttributes.height)
    const caption = typeof imageAttributes.caption === 'string' ? imageAttributes.caption : null

    const figureOutputAttrs = pickDefined({
      ...figureAttrs,
      class: figureClass
    })

    const imageOutputAttrs = pickDefined({
      src: HTMLAttributes.src,
      alt: HTMLAttributes.alt,
      title: HTMLAttributes.title,
      width: width == null ? undefined : String(Math.round(width)),
      height: height == null ? undefined : String(Math.round(height)),
      class: imageClass
    })

    return [
      'figure',
      figureOutputAttrs,
      ['img', imageOutputAttrs],
      ...(caption ? [['figcaption', { class: 'editor-image-caption' }, caption]] : [])
    ]
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setImageSize:
        (width, height) =>
        ({ state, tr, dispatch }) => {
          const updated = updateCurrentImage(state, tr, this.name, { width, height })
          if (!updated) return false
          dispatch?.(tr)
          return true
        },
      setImageAlign:
        align =>
        ({ state, tr, dispatch }) => {
          const updated = updateCurrentImage(state, tr, this.name, {
            align: normalizeImageAlign(align, this.options.defaultAlign)
          })
          if (!updated) return false
          dispatch?.(tr)
          return true
        },
      setImageCaption:
        caption =>
        ({ state, tr, dispatch }) => {
          const updated = updateCurrentImage(state, tr, this.name, { caption: caption?.trim() || null })
          if (!updated) return false
          dispatch?.(tr)
          return true
        },
      setImageAltText:
        alt =>
        ({ state, tr, dispatch }) => {
          const updated = updateCurrentImage(state, tr, this.name, { alt: alt?.trim() || '' })
          if (!updated) return false
          dispatch?.(tr)
          return true
        },
      setImageWrapMode:
        wrapMode =>
        ({ state, tr, dispatch }) => {
          const normalized = normalizeImageWrapMode(wrapMode, this.options.defaultWrapMode)
          const current = findCurrentImage(state, this.name)
          if (!current) return false

          const nextAlign =
            normalized === 'square-right'
              ? 'right'
              : normalized === 'square-left' || normalized === 'tight' || normalized === 'through'
                ? 'left'
                : normalized === 'inline'
                  ? (current.node.attrs.align ?? this.options.defaultAlign)
                  : (current.node.attrs.align ?? this.options.defaultAlign)
          const updated = updateCurrentImage(state, tr, this.name, {
            wrapMode: normalized,
            ...(nextAlign ? { align: nextAlign } : {}),
            display: normalized === 'inline' ? 'inline' : 'block',
            anchorMode: normalized === 'behind' || normalized === 'front' ? 'move-with-text' : 'inline',
            allowOverlap: normalized === 'behind' || normalized === 'front'
          })
          if (!updated) return false
          dispatch?.(tr)
          return true
        },
      setImageLayout:
        options =>
        ({ state, tr, dispatch }) => {
          const image = findCurrentImage(state, this.name)
          if (!image) return false

          const nextAttrs: Record<string, unknown> = {}

          if (options.width !== undefined) nextAttrs.width = options.width
          if (options.height !== undefined) nextAttrs.height = options.height
          if (options.originalWidth !== undefined) nextAttrs.originalWidth = options.originalWidth
          if (options.originalHeight !== undefined) nextAttrs.originalHeight = options.originalHeight
          if (options.widthUnit !== undefined) nextAttrs.widthUnit = options.widthUnit
          if (options.heightUnit !== undefined) nextAttrs.heightUnit = options.heightUnit
          if (options.widthPercent !== undefined) nextAttrs.widthPercent = options.widthPercent
          if (options.heightPercent !== undefined) nextAttrs.heightPercent = options.heightPercent
          if (options.widthRelativeTo !== undefined) nextAttrs.widthRelativeTo = options.widthRelativeTo
          if (options.heightRelativeTo !== undefined) nextAttrs.heightRelativeTo = options.heightRelativeTo
          if (options.scaleWidthPercent !== undefined) nextAttrs.scaleWidthPercent = options.scaleWidthPercent
          if (options.scaleHeightPercent !== undefined) nextAttrs.scaleHeightPercent = options.scaleHeightPercent
          if (options.rotation !== undefined) nextAttrs.rotation = options.rotation
          if (options.align !== undefined)
            nextAttrs.align = normalizeImageAlign(options.align, this.options.defaultAlign)
          if (options.caption !== undefined) nextAttrs.caption = options.caption?.trim() || null
          if (options.wrapMode !== undefined) {
            nextAttrs.wrapMode = normalizeImageWrapMode(options.wrapMode, this.options.defaultWrapMode)
          }
          if (options.anchorMode !== undefined) {
            nextAttrs.anchorMode = normalizeImageAnchorMode(options.anchorMode, this.options.defaultAnchorMode)
          }
          if (options.display !== undefined) {
            nextAttrs.display = normalizeImageDisplay(options.display, this.options.defaultDisplay)
          }
          if (options.lockAspectRatio !== undefined) nextAttrs.lockAspectRatio = options.lockAspectRatio
          if (options.distanceTop !== undefined) nextAttrs.distanceTop = options.distanceTop
          if (options.distanceRight !== undefined) nextAttrs.distanceRight = options.distanceRight
          if (options.distanceBottom !== undefined) nextAttrs.distanceBottom = options.distanceBottom
          if (options.distanceLeft !== undefined) nextAttrs.distanceLeft = options.distanceLeft
          if (options.offsetX !== undefined) nextAttrs.offsetX = options.offsetX
          if (options.offsetY !== undefined) nextAttrs.offsetY = options.offsetY
          if (options.allowOverlap !== undefined) nextAttrs.allowOverlap = options.allowOverlap
          if (options.zIndex !== undefined) nextAttrs.zIndex = options.zIndex
          if (options.alt !== undefined) nextAttrs.alt = options.alt
          if (options.title !== undefined) nextAttrs.title = options.title
          if (options.src !== undefined) nextAttrs.src = options.src

          tr.setNodeMarkup(image.pos, undefined, {
            ...image.node.attrs,
            ...nextAttrs
          })
          dispatch?.(tr)
          return true
        },
      replaceImage:
        attrs =>
        ({ state, tr, dispatch }) => {
          const updated = updateCurrentImage(state, tr, this.name, attrs)
          if (!updated) return false
          dispatch?.(tr)
          return true
        },
      removeSelectedImage:
        () =>
        ({ state, tr, dispatch }) => {
          const image = findCurrentImage(state, this.name)
          if (!image) return false
          tr.delete(image.pos, image.pos + image.node.nodeSize)
          dispatch?.(tr)
          return true
        }
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(({ node, editor, getPos, selected }) => (
      <CustomImageView node={node} editor={editor} getPos={getPos} selected={selected} options={this.options} />
    ))
  }
})
