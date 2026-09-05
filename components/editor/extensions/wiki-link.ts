import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { WikiLinkComponent } from '../nodes/WikiLinkComponent';

export interface WikiLinkOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikiLink: {
      setWikiLink: (attributes: { targetId: string; label: string }) => ReturnType;
    };
  }
}

export const WikiLinkExtension = Node.create<WikiLinkOptions>({
  name: 'wikiLink',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      targetId: { default: null },
      label: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-wiki-link]',
        getAttrs: (element) => {
          if (typeof element === 'string') return {};
          return {
            targetId: element.getAttribute('data-target-id'),
            label: element.getAttribute('data-label'),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        {
          'data-wiki-link': '',
          'data-target-id': HTMLAttributes.targetId,
          'data-label': HTMLAttributes.label,
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      0,
    ];
  },

  addCommands() {
    return {
      setWikiLink:
        (attributes) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: attributes,
            })
            .run();
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(WikiLinkComponent);
  },
});
