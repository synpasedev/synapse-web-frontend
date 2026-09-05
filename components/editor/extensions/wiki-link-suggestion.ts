import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import { WikiLinkList, WikiSuggestionItem } from '../WikiLinkList';
import { localDb } from '@/lib/dexie/db';

export const WikiLinkPluginKey = new PluginKey('wikiLinkSuggestion');

export const WikiLinkSuggestionExtension = Extension.create({
  name: 'wikiLinkSuggestion',

  addOptions() {
    return {
      workspaceId: '',
      suggestion: {
        char: '[[',
        allowSpaces: true,
        pluginKey: WikiLinkPluginKey,
        command: ({ editor, range, props }: any) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setWikiLink({
              targetId: props.id,
              label: props.title,
            })
            .insertContent(' ')
            .run();
        },
      },
    };
  },

  addProseMirrorPlugins() {
    const workspaceId = this.options.workspaceId;

    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        pluginKey: WikiLinkPluginKey,
        items: async ({ query }: { query: string }) => {
          const notes = await localDb.notes
            .where('workspace_id')
            .equals(workspaceId)
            .and((n) => !n.is_archived)
            .toArray();

          const lower = query.toLowerCase();
          const matches = notes
            .filter((n) => n.title.toLowerCase().includes(lower))
            .slice(0, 8)
            .map(
              (n): WikiSuggestionItem => ({
                id: n.id,
                title: n.title,
                icon: n.icon,
              })
            );

          return matches;
        },
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: HTMLDivElement | null = null;

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(WikiLinkList, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) return;

              popup = document.createElement('div');
              popup.style.position = 'absolute';
              popup.style.zIndex = '9999';
              document.body.appendChild(popup);
              popup.appendChild(component.element);

              const rect = props.clientRect();
              if (rect) {
                popup.style.left = `${rect.left + window.scrollX}px`;
                popup.style.top = `${rect.bottom + window.scrollY + 8}px`;
              }
            },

            onUpdate: (props: any) => {
              component?.updateProps(props);
              if (!props.clientRect || !popup) return;
              const rect = props.clientRect();
              if (rect) {
                popup.style.left = `${rect.left + window.scrollX}px`;
                popup.style.top = `${rect.bottom + window.scrollY + 8}px`;
              }
            },

            onKeyDown: (props: any) => {
              if (props.event.key === 'Escape') {
                popup?.remove();
                component?.destroy();
                return true;
              }
              return (component?.ref as any)?.onKeyDown(props);
            },

            onExit: () => {
              popup?.remove();
              component?.destroy();
            },
          };
        },
      }),
    ];
  },
});
