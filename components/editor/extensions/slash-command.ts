import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import { SlashMenuList, SLASH_ITEMS, CONVERT_BLOCK_ITEMS } from '../SlashMenuList';

export const SlashCommandPluginKey = new PluginKey('slashCommandSuggestion');
export const SlashSelectionPluginKey = new PluginKey('slashSelectionInterceptor');

export const SlashCommandExtension = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        pluginKey: SlashCommandPluginKey,
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range, isSelection: false });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    let activeSelectionPopup: HTMLDivElement | null = null;
    let activeSelectionComponent: ReactRenderer | null = null;

    const closeSelectionMenu = () => {
      if (activeSelectionPopup) {
        activeSelectionPopup.remove();
        activeSelectionPopup = null;
      }
      if (activeSelectionComponent) {
        activeSelectionComponent.destroy();
        activeSelectionComponent = null;
      }
      document.removeEventListener('mousedown', handleOutsideMouseDown);
    };

    const handleOutsideMouseDown = (e: MouseEvent) => {
      if (activeSelectionPopup && !activeSelectionPopup.contains(e.target as Node)) {
        closeSelectionMenu();
      }
    };

    const openSelectionConvertMenu = (view: any, selection: any) => {
      closeSelectionMenu();

      const { from, to } = selection;
      const selectedText = view.state.doc.textBetween(from, to, ' ');

      // Position from DOM range or ProseMirror coords
      let top = 0;
      let left = 0;

      const domSelection = window.getSelection();
      if (domSelection && domSelection.rangeCount > 0) {
        const rect = domSelection.getRangeAt(0).getBoundingClientRect();
        if (rect && (rect.width > 0 || rect.height > 0)) {
          top = rect.bottom + window.scrollY + 8;
          left = rect.left + window.scrollX;
        }
      }

      if (!top && !left) {
        const coords = view.coordsAtPos(from);
        top = coords.bottom + window.scrollY + 8;
        left = coords.left + window.scrollX;
      }

      // Constrain horizontally within viewport
      const maxLeft = Math.max(16, window.innerWidth - 340);
      left = Math.max(16, Math.min(left, maxLeft));

      activeSelectionPopup = document.createElement('div');
      activeSelectionPopup.style.position = 'absolute';
      activeSelectionPopup.style.zIndex = '9999';
      activeSelectionPopup.style.left = `${left}px`;
      activeSelectionPopup.style.top = `${top}px`;
      document.body.appendChild(activeSelectionPopup);

      activeSelectionComponent = new ReactRenderer(SlashMenuList, {
        editor,
        props: {
          editor,
          isSelection: true,
          selectedText,
          selection: { from, to },
          items: CONVERT_BLOCK_ITEMS,
          command: (item: any) => {
            item.command({
              editor,
              isSelection: true,
              selection: { from, to },
            });
            closeSelectionMenu();
          },
          onClose: () => {
            closeSelectionMenu();
          },
        },
      });

      activeSelectionPopup.appendChild(activeSelectionComponent.element);

      setTimeout(() => {
        document.addEventListener('mousedown', handleOutsideMouseDown);
      }, 20);
    };

    return [
      // 1. Selection Interceptor: Detect '/' on highlighted text to trigger Convert To menu
      new Plugin({
        key: SlashSelectionPluginKey,
        props: {
          handleKeyDown: (view, event) => {
            // If the selection convert menu is currently open, delegate keyboard events
            if (activeSelectionComponent) {
              if (event.key === 'Escape') {
                closeSelectionMenu();
                return true;
              }
              const handled = (activeSelectionComponent.ref as any)?.onKeyDown?.({ event });
              if (handled) return true;
            }

            // Detect pressing '/' while text is selected
            if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
              const { selection } = view.state;
              if (!selection.empty) {
                event.preventDefault();
                openSelectionConvertMenu(view, selection);
                return true;
              }
            }

            return false;
          },
        },
      }),

      // 2. Standard TipTap Suggestion for '/' commands when text is not selected
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        pluginKey: SlashCommandPluginKey,
        items: ({ query }: { query: string }) => {
          const q = query.toLowerCase().trim();
          if (!q) {
            return SLASH_ITEMS;
          }

          const combined = [...SLASH_ITEMS, ...CONVERT_BLOCK_ITEMS];
          const seen = new Set<string>();
          return combined.filter((item) => {
            if (seen.has(item.id)) return false;
            const matchTitle = item.title.toLowerCase().includes(q);
            const matchDesc = item.description.toLowerCase().includes(q);
            const matchKeywords = item.keywords?.some((k) => k.toLowerCase().includes(q));
            if (matchTitle || matchDesc || matchKeywords) {
              seen.add(item.id);
              return true;
            }
            return false;
          });
        },
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: HTMLDivElement | null = null;

          return {
            onStart: (props: any) => {
              // Ensure selection menu is closed if opening normal suggestion
              closeSelectionMenu();

              component = new ReactRenderer(SlashMenuList, {
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
                const maxLeft = Math.max(16, window.innerWidth - 340);
                const left = Math.max(16, Math.min(rect.left + window.scrollX, maxLeft));
                popup.style.left = `${left}px`;
                popup.style.top = `${rect.bottom + window.scrollY + 8}px`;
              }
            },

            onUpdate: (props: any) => {
              component?.updateProps(props);
              if (!props.clientRect || !popup) return;
              const rect = props.clientRect();
              if (rect) {
                const maxLeft = Math.max(16, window.innerWidth - 340);
                const left = Math.max(16, Math.min(rect.left + window.scrollX, maxLeft));
                popup.style.left = `${left}px`;
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
