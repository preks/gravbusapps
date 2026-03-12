/**
 * Image extension that renders via authenticated fetch for file-service URLs.
 */

import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { DocumentImageView } from '../components/DocumentImageView'

export interface DocumentImageOptions {
  getAccessToken: () => string
  HTMLAttributes?: Record<string, unknown>
}

export const DocumentImage = Image.extend<DocumentImageOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      getAccessToken: () => ''
    }
  },

  draggable: false,

  addNodeView() {
    return ReactNodeViewRenderer(({ node, editor, getPos, selected }) => {
      const getAccessToken =
        (
          editor?.extensionManager?.extensions?.find((e: { name: string }) => e.name === 'image') as
            | { options?: { getAccessToken?: () => string } }
            | undefined
        )?.options?.getAccessToken ?? (() => '')
      return (
        <DocumentImageView
          node={node}
          editor={editor}
          getPos={getPos}
          selected={selected}
          getAccessToken={getAccessToken}
        />
      )
    })
  }
})
