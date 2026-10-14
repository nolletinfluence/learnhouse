import Heading from '@tiptap/extension-heading'
import { Plugin } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { headingId } from '@/lib/student-experience'

export const CustomHeading = Heading.extend({
  addProseMirrorPlugins() {
    return [new Plugin({
      props: {
        decorations(state) {
          const decorations: Decoration[] = []
          state.doc.descendants((node, position) => {
            if (node.type.name === 'heading') decorations.push(Decoration.node(position, position + node.nodeSize, { id: headingId(node.textContent, position) }))
          })
          return DecorationSet.create(state.doc, decorations)
        },
      },
    })]
  },

  renderHTML({ node, HTMLAttributes }: { node: any; HTMLAttributes: any }) {
    const hasLevel = this.options.levels.includes(node.attrs.level)
    const level = hasLevel ? node.attrs.level : this.options.levels[0]

    const headingText = node.textContent || ''
    const id = headingId(headingText)

    return [
      `h${level}`,
      {
        ...HTMLAttributes,
        id,
      },
      0,
    ]
  },
})
