'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useRouter } from 'next/navigation';
import { Note, Link as DomainLink } from '@/types/domain';
import { GraphControls } from './GraphControls';

interface NodeItem extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  icon: string;
  connections: number;
}

interface LinkItem extends d3.SimulationLinkDatum<NodeItem> {
  source: string | NodeItem;
  target: string | NodeItem;
}

interface GraphViewProps {
  workspaceId: string;
  notes: Note[];
  links: DomainLink[];
}

export const GraphView: React.FC<GraphViewProps> = ({ workspaceId, notes, links }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredNode, setHoveredNode] = useState<NodeItem | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);

  const hoveredNodeRef = useRef<NodeItem | null>(null);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter((n) => n.title.toLowerCase().includes(q));
  }, [notes, searchQuery]);

  const filteredLinks = useMemo(() => {
    const validIds = new Set(filteredNotes.map((n) => n.id));
    return links.filter((l) => validIds.has(l.source_note_id) && validIds.has(l.target_note_id));
  }, [links, filteredNotes]);

  // Keep track of previous node positions so search/filter transitions don't scatter
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.parentElement?.clientHeight || 600;
    const dpi = window.devicePixelRatio || 1;

    canvas.width = width * dpi;
    canvas.height = height * dpi;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpi, dpi);

    const connectionMap: Record<string, number> = {};
    filteredLinks.forEach((l) => {
      connectionMap[l.source_note_id] = (connectionMap[l.source_note_id] || 0) + 1;
      connectionMap[l.target_note_id] = (connectionMap[l.target_note_id] || 0) + 1;
    });

    const graphNodes: NodeItem[] = filteredNotes.map((n) => {
      const prevPos = nodePositionsRef.current.get(n.id);
      return {
        id: n.id,
        title: n.title || 'Untitled',
        icon: n.icon || '📄',
        connections: connectionMap[n.id] || 0,
        x: prevPos ? prevPos.x : width / 2 + (Math.random() - 0.5) * 260,
        y: prevPos ? prevPos.y : height / 2 + (Math.random() - 0.5) * 260,
      };
    });

    const graphLinks: LinkItem[] = filteredLinks.map((l) => ({
      source: l.source_note_id,
      target: l.target_note_id,
    }));

    const simulation = d3
      .forceSimulation<NodeItem>(graphNodes)
      .force(
        'link',
        d3
          .forceLink<NodeItem, LinkItem>(graphLinks)
          .id((d) => d.id)
          .distance(85)
      )
      .force('charge', d3.forceManyBody().strength(-180))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(26));

    let transform = d3.zoomIdentity;

    const render = () => {
      ctx.save();
      ctx.clearRect(0, 0, width, height);

      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);

      // Save positions for stability
      graphNodes.forEach((node) => {
        if (node.x != null && node.y != null) {
          nodePositionsRef.current.set(node.id, { x: node.x, y: node.y });
        }
      });

      // 1. Delicate Links
      graphLinks.forEach((link) => {
        const source = link.source as NodeItem;
        const target = link.target as NodeItem;
        if (source.x && source.y && target.x && target.y) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = 'rgba(125, 131, 221, 0.16)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      });

      // 2. Nodes
      const currentHovered = hoveredNodeRef.current;
      graphNodes.forEach((node) => {
        if (!node.x || !node.y) return;
        const radius = Math.min(6 + node.connections * 1.5, 14);
        const isHovered = currentHovered?.id === node.id;

        // Soft outer glow
        if (isHovered || node.connections > 1) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + (isHovered ? 6 : 3), 0, 2 * Math.PI);
          ctx.fillStyle = isHovered ? 'rgba(125, 131, 221, 0.2)' : 'rgba(125, 131, 221, 0.08)';
          ctx.fill();
        }

        // Inner circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = isHovered ? '#7d83dd' : node.connections > 1 ? '#686ea8' : '#3f4251';
        ctx.fill();

        // Node Label
        ctx.fillStyle = isHovered ? '#f0f2f8' : '#9ca1b2';
        ctx.font = isHovered ? 'bold 11px Inter, sans-serif' : '10.5px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.title, node.x, node.y + radius + 13);
      });

      ctx.restore();
    };

    simulation.on('tick', render);

    const zoom = d3
      .zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.2, 3.5])
      .on('zoom', (event) => {
        transform = event.transform;
        render();
      });

    zoomBehaviorRef.current = zoom;
    d3.select(canvas).call(zoom);

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = (event.clientX - rect.left - transform.x) / transform.k;
      const clickY = (event.clientY - rect.top - transform.y) / transform.k;

      const found = graphNodes.find(
        (n) => Math.hypot((n.x || 0) - clickX, (n.y || 0) - clickY) < 20
      );

      if (found?.id !== hoveredNodeRef.current?.id) {
        hoveredNodeRef.current = found || null;
        setHoveredNode(found || null);
        canvas.style.cursor = found ? 'pointer' : 'grab';
        render();
      }
    };

    const handleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = (event.clientX - rect.left - transform.x) / transform.k;
      const clickY = (event.clientY - rect.top - transform.y) / transform.k;

      const clicked = graphNodes.find(
        (n) => Math.hypot((n.x || 0) - clickX, (n.y || 0) - clickY) < 20
      );

      if (clicked) {
        router.push(`/${workspaceId}/notes/${clicked.id}`);
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    return () => {
      simulation.stop();
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, [filteredNotes, filteredLinks, workspaceId, router]);

  const handleZoomIn = () => {
    if (canvasRef.current && zoomBehaviorRef.current) {
      d3.select(canvasRef.current).transition().call(zoomBehaviorRef.current.scaleBy, 1.25);
    }
  };

  const handleZoomOut = () => {
    if (canvasRef.current && zoomBehaviorRef.current) {
      d3.select(canvasRef.current).transition().call(zoomBehaviorRef.current.scaleBy, 0.75);
    }
  };

  const handleResetZoom = () => {
    if (canvasRef.current && zoomBehaviorRef.current) {
      d3.select(canvasRef.current).transition().call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4.5rem)] bg-[#14151a] overflow-hidden rounded-xl border border-border/50 shadow-xs">
      <GraphControls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        nodeCount={filteredNotes.length}
        linkCount={filteredLinks.length}
      />

      <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {hoveredNode && (
        <div className="absolute bottom-5 left-5 pointer-events-none glass-dropdown p-2.5 rounded-lg border border-border/70 max-w-xs shadow-md animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-base">{hoveredNode.icon}</span>
            <span className="text-xs font-semibold text-foreground truncate">{hoveredNode.title}</span>
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <span>{hoveredNode.connections} links</span>
            <span>•</span>
            <span className="text-indigo-300 font-medium">Click to open</span>
          </div>
        </div>
      )}
    </div>
  );
};
