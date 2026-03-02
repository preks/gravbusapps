/**
 * SearchHighlight: ProseMirror plugin that decorates search match ranges.
 * The Navigation panel dispatches setSearchHighlights(matches, selectedIndex) to update highlights.
 */

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const SearchHighlightPluginKey = new PluginKey<SearchHighlightState>('searchHighlight')

export interface SearchHighlightMatch {
  from: number
  to: number
}

export interface SearchHighlightState {
  decorationSet: DecorationSet
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchHighlight: {
      setSearchHighlights: (matches: SearchHighlightMatch[], selectedIndex: number) => ReturnType
      clearSearchHighlights: () => ReturnType
    }
  }
}

export const SearchHighlight = Extension.create({
  name: 'searchHighlight',

  addCommands() {
    return {
      setSearchHighlights:
        (matches: SearchHighlightMatch[], selectedIndex: number) =>
        ({ editor }) => {
          editor.view.dispatch(editor.state.tr.setMeta(SearchHighlightPluginKey, { matches, selectedIndex }))
          return true
        },
      clearSearchHighlights:
        () =>
        ({ editor }) => {
          editor.view.dispatch(editor.state.tr.setMeta(SearchHighlightPluginKey, { matches: [], selectedIndex: -1 }))
          return true
        }
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchHighlightState>({
        key: SearchHighlightPluginKey,
        state: {
          init() {
            return { decorationSet: DecorationSet.empty }
          },
          apply(tr, value, oldState, newState) {
            const meta = tr.getMeta(SearchHighlightPluginKey) as
              | { matches: SearchHighlightMatch[]; selectedIndex: number }
              | undefined
            if (meta !== undefined) {
              const { matches, selectedIndex } = meta
              if (!matches.length || selectedIndex < 0 || selectedIndex >= matches.length) {
                return { decorationSet: DecorationSet.empty }
              }
              const { from, to } = matches[selectedIndex]
              const clampedTo = Math.min(to, newState.doc.content.size)
              const clampedFrom = Math.min(from, clampedTo)
              if (clampedFrom >= clampedTo) {
                return { decorationSet: DecorationSet.empty }
              }
              const decos = [
                Decoration.inline(clampedFrom, clampedTo, { class: 'navigation-search-highlight-current' })
              ]
              return {
                decorationSet: DecorationSet.create(newState.doc, decos)
              }
            }
            const mapped = value.decorationSet.map(tr.mapping, tr.doc)
            return { decorationSet: mapped }
          }
        },
        props: {
          decorations(state) {
            const pluginState = SearchHighlightPluginKey.get(state)
            return pluginState?.decorationSet ?? DecorationSet.empty
          }
        }
      })
    ]
  }
})
