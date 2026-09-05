'use client';

import React from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useRouter, useParams } from 'next/navigation';

export const WikiLinkComponent: React.FC<NodeViewProps> = ({ node }) => {
  const router = useRouter();
  const params = useParams();
  const { targetId, label } = node.attrs;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (targetId && params.workspaceId) {
      router.push(`/${params.workspaceId}/notes/${targetId}`);
    }
  };

  return (
    <NodeViewWrapper as="span" className="inline-block mx-0.5 align-middle">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-medium text-xs border border-indigo-500/30 transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
        title={`Navigate to: ${label || 'Note'}`}
      >
        <span className="opacity-60 text-[10px]">[[</span>
        <span className="font-semibold">{label || 'Untitled Note'}</span>
        <span className="opacity-60 text-[10px]">]]</span>
      </button>
    </NodeViewWrapper>
  );
};
