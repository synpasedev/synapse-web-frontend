'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Whiteboard, CanvasElement, CanvasConnection } from '@/types/domain';
import { useMutateWhiteboard } from '@/hooks/use-whiteboard';
import { useCreateNote } from '@/hooks/use-notes';
import { CanvasToolbar, ActiveTool } from './CanvasToolbar';
import { CanvasMinimap } from './CanvasMinimap';
import { StickyNoteElement } from './elements/StickyNoteElement';
import { NoteCardElement } from './elements/NoteCardElement';
import { MindmapNodeElement } from './elements/MindmapNodeElement';
import { ShapeElement } from './elements/ShapeElement';
import { FrameElement } from './elements/FrameElement';
import { StampElement } from './elements/StampElement';
import { TextElement } from './elements/TextElement';
import { FigJamTemplateModal } from './FigJamTemplateModal';
import { Copy, Trash2, X } from 'lucide-react';

interface HistorySnapshot {
  elements: CanvasElement[];
  connections: CanvasConnection[];
}

function getSvgPathFromPoints(
  points: Array<{ x: number; y: number }>,
  offsetX = 0,
  offsetY = 0
): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x + offsetX} ${points[0].y + offsetY} L ${
      points[0].x + offsetX + 0.1
    } ${points[0].y + offsetY + 0.1}`;
  }
  let d = `M ${points[0].x + offsetX} ${points[0].y + offsetY}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2 + offsetX;
    const midY = (prev.y + curr.y) / 2 + offsetY;
    d += ` Q ${prev.x + offsetX} ${prev.y + offsetY}, ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x + offsetX} ${last.y + offsetY}`;
  return d;
}

export function getNodeAutoDimensions(el: CanvasElement): {
  width: number;
  height: number;
  minW: number;
  minH: number;
} {
  let minW = 160;
  let minH = 60;

  if (el.type === 'mindmap_node') {
    minW = 180;
    minH = 48;
    const text = el.content?.text || '';
    const charW = 8;
    const padding = 76; // padding + AI button + anchor spacing
    const autoW = Math.ceil(text.length * charW + padding);
    const width = Math.max(minW, Math.max(el.width || 0, autoW));
    return { width, height: minH, minW, minH };
  }

  if (el.type === 'shape') {
    const shape = el.content?.shape_type || 'rectangle';
    minW = shape === 'pill' ? 180 : 160;
    minH = shape === 'circle' || shape === 'diamond' ? 140 : 64;
    const text = el.content?.text || '';
    const charW = 8.5;
    const padding = 54;
    const autoW = Math.ceil(text.length * charW + padding);
    const width = Math.max(minW, Math.max(el.width || 0, autoW));
    const height = Math.max(minH, el.height || minH);
    return { width, height, minW, minH };
  }

  if (el.type === 'text') {
    minW = 120;
    minH = 36;
    const text = el.content?.text || '';
    const fontSize = el.content?.font_size || 16;
    const lines = text.split('\n');
    const maxLineLen = Math.max(...lines.map((l) => l.length), 0);
    const charW = fontSize * 0.62;
    const lineH = fontSize * 1.35;
    const autoW = Math.ceil(maxLineLen * charW + 28);
    const autoH = Math.ceil(lines.length * lineH + 16);
    const width = Math.max(minW, Math.max(el.width || 0, autoW));
    const height = Math.max(minH, Math.max(el.height || 0, autoH));
    return { width, height, minW, minH };
  }

  if (el.type === 'sticky') {
    minW = 210;
    minH = 180;
    const text = el.content?.text || '';
    const lines = text.split('\n');
    let totalLines = 0;
    lines.forEach((line) => {
      totalLines += Math.max(1, Math.ceil(line.length / 26));
    });
    const autoH = Math.ceil(80 + totalLines * 18);
    const width = Math.max(minW, el.width || minW);
    const height = Math.max(minH, Math.max(el.height || 0, autoH));
    return { width, height, minW, minH };
  }

  if (el.type === 'note_card') {
    minW = 240;
    minH = 140;
    const text = el.content?.text || '';
    const totalLines = Math.max(1, Math.ceil(text.length / 32));
    const autoH = Math.ceil(70 + totalLines * 18 + 24);
    const width = Math.max(minW, el.width || minW);
    const height = Math.max(minH, Math.max(el.height || 0, autoH));
    return { width, height, minW, minH };
  }

  return {
    width: Math.max(el.width || 100, 40),
    height: Math.max(el.height || 60, 40),
    minW: 40,
    minH: 40,
  };
}

export const WhiteboardCanvas: React.FC<{
  whiteboard: Whiteboard;
  workspaceId: string;
  mode?: 'whiteboard' | 'canvas';
}> = ({ whiteboard, workspaceId, mode = 'whiteboard' }) => {
  const { mutate: updateWhiteboard } = useMutateWhiteboard(whiteboard.id);
  const { mutateAsync: createNote } = useCreateNote();

  const [elements, setElements] = useState<CanvasElement[]>(whiteboard.elements || []);
  const [connections, setConnections] = useState<CanvasConnection[]>(whiteboard.connections || []);
  const [viewport, setViewport] = useState(whiteboard.viewport || { x: 0, y: 0, zoom: 1 });
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');

  // Drawing & FigJam Tool Settings
  const [drawingColor, setDrawingColor] = useState('#818cf8');
  const [drawingWidth, setDrawingWidth] = useState(3);
  const [activeStamp, setActiveStamp] = useState('👍');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawingPoints, setCurrentDrawingPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const templateModalOpenRef = useRef(false);
  useEffect(() => {
    templateModalOpenRef.current = templateModalOpen;
  }, [templateModalOpen]);

  // Spacebar temporary pan state
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const isSpacePressedRef = useRef(false);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Marquee Drag Selection State
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const initialSelectionRef = useRef<Set<string>>(new Set());
  const didMarqueeDragRef = useRef(false);

  // Multi-Element Drag State
  const [dragState, setDragState] = useState<{
    startX: number;
    startY: number;
    initialPositions: Map<string, { x: number; y: number }>;
    frameEnclosed: Array<{ id: string; dx: number; dy: number }>;
    clickedId: string;
    wasAlreadySelected: boolean;
    isMultiKey: boolean;
    didMove: boolean;
  } | null>(null);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Canvas Pan State
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Arrow connecting state
  const [connectingFrom, setConnectingFrom] = useState<{
    id: string;
    anchor: 'top' | 'right' | 'bottom' | 'left';
  } | null>(null);
  const [mouseCanvasPos, setMouseCanvasPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Push history snapshot
  const pushHistory = useCallback(
    (newElements: CanvasElement[], newConnections: CanvasConnection[]) => {
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        return [...next, { elements: newElements, connections: newConnections }];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  useEffect(() => {
    setElements(whiteboard.elements || []);
    setConnections(whiteboard.connections || []);
    setViewport(whiteboard.viewport || { x: 0, y: 0, zoom: 1 });
    setHistory([{ elements: whiteboard.elements || [], connections: whiteboard.connections || [] }]);
    setHistoryIndex(0);
    setSelectedIds(new Set());
  }, [whiteboard.id]);

  const persistChanges = useCallback(
    (newElements = elements, newConnections = connections, newViewport = viewport) => {
      updateWhiteboard({
        elements: newElements,
        connections: newConnections,
        viewport: newViewport,
      });
    },
    [elements, connections, viewport, updateWhiteboard]
  );

  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
        x: (screenX - rect.left - viewport.x) / viewport.zoom,
        y: (screenY - rect.top - viewport.y) / viewport.zoom,
      };
    },
    [viewport]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const snap = history[targetIndex];
      setElements(snap.elements);
      setConnections(snap.connections);
      setHistoryIndex(targetIndex);
      setSelectedIds(new Set());
      persistChanges(snap.elements, snap.connections);
    }
  }, [historyIndex, history, persistChanges]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const snap = history[targetIndex];
      setElements(snap.elements);
      setConnections(snap.connections);
      setHistoryIndex(targetIndex);
      setSelectedIds(new Set());
      persistChanges(snap.elements, snap.connections);
    }
  }, [historyIndex, history, persistChanges]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const remainingElements = elements.filter((el) => !selectedIds.has(el.id));
    const remainingConnections = connections.filter(
      (c) => !selectedIds.has(c.from_element_id) && !selectedIds.has(c.to_element_id)
    );
    setElements(remainingElements);
    setConnections(remainingConnections);
    setSelectedIds(new Set());
    pushHistory(remainingElements, remainingConnections);
    persistChanges(remainingElements, remainingConnections);
  }, [selectedIds, elements, connections, pushHistory, persistChanges]);

  const handleDuplicateSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const now = new Date().toISOString();
    const idMap = new Map<string, string>();

    const duplicatedElements: CanvasElement[] = [];
    elements.forEach((el) => {
      if (selectedIds.has(el.id)) {
        const newId = `el-${crypto.randomUUID().slice(0, 8)}`;
        idMap.set(el.id, newId);
        duplicatedElements.push({
          ...el,
          id: newId,
          x: el.x + 40,
          y: el.y + 40,
          created_at: now,
          updated_at: now,
        });
      }
    });

    const duplicatedConnections: CanvasConnection[] = [];
    connections.forEach((conn) => {
      if (idMap.has(conn.from_element_id) && idMap.has(conn.to_element_id)) {
        duplicatedConnections.push({
          ...conn,
          id: `conn-${crypto.randomUUID().slice(0, 8)}`,
          from_element_id: idMap.get(conn.from_element_id)!,
          to_element_id: idMap.get(conn.to_element_id)!,
        });
      }
    });

    const updatedElements = [...elements, ...duplicatedElements];
    const updatedConnections = [...connections, ...duplicatedConnections];
    setElements(updatedElements);
    setConnections(updatedConnections);
    setSelectedIds(new Set(duplicatedElements.map((el) => el.id)));
    pushHistory(updatedElements, updatedConnections);
    persistChanges(updatedElements, updatedConnections);
  }, [selectedIds, elements, connections, pushHistory, persistChanges]);

  const handleNudgeSelected = useCallback(
    (dx: number, dy: number) => {
      if (selectedIds.size === 0) return;
      const updated = elements.map((el) => {
        if (selectedIds.has(el.id)) {
          return { ...el, x: el.x + dx, y: el.y + dy };
        }
        return el;
      });
      setElements(updated);
      pushHistory(updated, connections);
      persistChanges(updated, connections);
    },
    [selectedIds, elements, connections, pushHistory, persistChanges]
  );

  // Keyboard Shortcuts (Figma/FigJam Style)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (templateModalOpenRef.current) {
        return;
      }

      const tag = (e.target as HTMLElement).tagName?.toLowerCase();
      const isInput =
        tag === 'input' || tag === 'textarea' || (e.target as HTMLElement).isContentEditable;

      // Spacebar for temporary Hand Pan tool
      if ((e.code === 'Space' || e.key === ' ') && !isInput) {
        e.preventDefault();
        if (!isSpacePressedRef.current) {
          isSpacePressedRef.current = true;
          setIsSpacePressed(true);
        }
        return;
      }

      if (isInput) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;

      // Prevent native browser zoom and zoom the canvas instead
      if (
        isCtrl &&
        (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_' || e.key === '0')
      ) {
        e.preventDefault();
        if (e.key === '+' || e.key === '=') {
          const newZ = Math.min(viewport.zoom * 1.15, 3.0);
          setViewport((prev) => ({ ...prev, zoom: newZ }));
          persistChanges(elements, connections, { ...viewport, zoom: newZ });
        } else if (e.key === '-' || e.key === '_') {
          const newZ = Math.max(viewport.zoom * 0.85, 0.2);
          setViewport((prev) => ({ ...prev, zoom: newZ }));
          persistChanges(elements, connections, { ...viewport, zoom: newZ });
        } else if (e.key === '0') {
          setViewport((prev) => ({ ...prev, zoom: 1.0 }));
          persistChanges(elements, connections, { ...viewport, zoom: 1.0 });
        }
        return;
      }

      if (isCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (isCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (isCtrl && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedIds(new Set(elements.map((el) => el.id)));
        return;
      }

      if (isCtrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedIds(new Set());
        setConnectingFrom(null);
        setActiveTool('select');
        return;
      }

      // Arrow Key Nudges
      const nudgeAmount = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleNudgeSelected(0, -nudgeAmount);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNudgeSelected(0, nudgeAmount);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNudgeSelected(-nudgeAmount, 0);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNudgeSelected(nudgeAmount, 0);
        return;
      }

      // Tool Shortcuts
      if (!isCtrl && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'v') setActiveTool('select');
        else if (k === 'h') setActiveTool('hand');
        else if (k === 'p') setActiveTool('pen');
        else if (k === 'b') setActiveTool('highlighter');
        else if (k === 'e') setActiveTool('eraser');
        else if (k === 's') setActiveTool('sticky');
        else if (k === 'x') setActiveTool('stamp');
        else if (k === 't') setActiveTool('text');
        else if (k === 'r') setActiveTool('rectangle');
        else if (k === 'o') setActiveTool('circle');
        else if (k === 'a') setActiveTool('arrow');
        else if (k === 'f') setActiveTool('frame');
        else if (k === 'n') setActiveTool('note_card');
        else if (k === 'm') setActiveTool('mindmap');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        isSpacePressedRef.current = false;
        setIsSpacePressed(false);
      }
    };

    const handleBlur = () => {
      isSpacePressedRef.current = false;
      setIsSpacePressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [
    elements,
    selectedIds,
    viewport,
    handleUndo,
    handleRedo,
    handleDeleteSelected,
    handleDuplicateSelected,
    handleNudgeSelected,
    persistChanges,
    connections,
  ]);

  // Non-passive wheel event listener to prevent native browser page zoom and zoom canvas smoothly towards cursor
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      // If template modal is open or scroll event originated in a modal/dialog, let it scroll naturally without scrolling canvas
      if (templateModalOpenRef.current) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (target && (target.closest('.fixed') || target.closest('[role="dialog"]'))) {
        return;
      }

      // Calling preventDefault on a non-passive listener guarantees the browser webpage will NOT zoom!
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Zoom towards mouse pointer coordinates (Figma/FigJam style)
        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
        setViewport((prev) => {
          const newZoom = Math.min(Math.max(prev.zoom * zoomFactor, 0.15), 3.0);
          const rect = container.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          const newX = mouseX - (mouseX - prev.x) * (newZoom / prev.zoom);
          const newY = mouseY - (mouseY - prev.y) * (newZoom / prev.zoom);

          const newVp = { x: newX, y: newY, zoom: newZoom };
          persistChanges(elements, connections, newVp);
          return newVp;
        });
      } else {
        // Two-finger swipe or scroll wheel = Pan canvas
        setViewport((prev) => {
          const newVp = {
            ...prev,
            x: prev.x - e.deltaX,
            y: prev.y - e.deltaY,
          };
          return newVp;
        });
      }
    };

    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleNativeWheel);
    };
  }, [elements, connections, persistChanges]);


  // Double Click Canvas = Quick FigJam Sticky Note Creation
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (dragState?.didMove || isDrawing) return;
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const id = `el-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const newSticky: CanvasElement = {
      id,
      type: 'sticky',
      x: Math.round(x - 100),
      y: Math.round(y - 80),
      width: 210,
      height: 180,
      content: { text: '', color: '#fef08a', bg_color: '#713f12', author: 'You' },
      z_index: elements.length + 1,
      created_at: now,
      updated_at: now,
    };

    const updated = [...elements, newSticky];
    setElements(updated);
    setSelectedIds(new Set([id]));
    pushHistory(updated, connections);
    persistChanges(updated);
  };

  // Canvas Click (Element creation or Background deselect)
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (connectingFrom) {
      setConnectingFrom(null);
      return;
    }

    if (didMarqueeDragRef.current) {
      didMarqueeDragRef.current = false;
      return;
    }

    // Do not interfere if user was drawing
    if (activeTool === 'hand' || isSpacePressed) {
      return;
    }

    if (activeTool === 'select') {
      if (!dragState?.didMove) {
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          setSelectedIds(new Set());
        }
      }
      return;
    }


    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const id = `el-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    let newElement: CanvasElement | null = null;

    if (activeTool === 'sticky') {
      newElement = {
        id,
        type: 'sticky',
        x: Math.round(x - 105),
        y: Math.round(y - 90),
        width: 210,
        height: 180,
        content: { text: '', color: '#fef08a', bg_color: '#713f12', author: 'You' },
        z_index: elements.length + 1,
        created_at: now,
        updated_at: now,
      };
    } else if (activeTool === 'stamp') {
      newElement = {
        id,
        type: 'stamp',
        x: Math.round(x - 24),
        y: Math.round(y - 24),
        width: 48,
        height: 48,
        content: { emoji: activeStamp, count: 1, author: 'You' },
        z_index: elements.length + 10,
        created_at: now,
        updated_at: now,
      };
    } else if (activeTool === 'text') {
      newElement = {
        id,
        type: 'text',
        x: Math.round(x - 70),
        y: Math.round(y - 20),
        width: 160,
        height: 48,
        content: { text: 'Text Label', font_size: 18, color: 'var(--foreground)' },
        z_index: elements.length + 1,
        created_at: now,
        updated_at: now,
      };
    } else if (
      activeTool === 'rectangle' ||
      activeTool === 'circle' ||
      activeTool === 'diamond' ||
      activeTool === 'pill'
    ) {
      newElement = {
        id,
        type: 'shape',
        x: Math.round(x - 80),
        y: Math.round(y - 80),
        width: activeTool === 'pill' ? 180 : 160,
        height: activeTool === 'pill' ? 70 : 160,
        content: { shape_type: activeTool, color: '#6366f1', text: '' },
        z_index: elements.length + 1,
        created_at: now,
        updated_at: now,
      };
    } else if (activeTool === 'frame') {
      newElement = {
        id,
        type: 'frame',
        x: Math.round(x - 200),
        y: Math.round(y - 150),
        width: 440,
        height: 320,
        content: { title: 'Project Section' },
        z_index: 0,
        created_at: now,
        updated_at: now,
      };
    } else if (activeTool === 'note_card') {
      newElement = {
        id,
        type: 'note_card',
        x: Math.round(x - 120),
        y: Math.round(y - 70),
        width: 240,
        height: 140,
        content: { title: 'New Note Card', text: 'Double click to open editor.' },
        z_index: elements.length + 1,
        created_at: now,
        updated_at: now,
      };
    } else if (activeTool === 'mindmap') {
      newElement = {
        id,
        type: 'mindmap_node',
        x: Math.round(x - 90),
        y: Math.round(y - 25),
        width: 180,
        height: 50,
        content: { text: 'Mindmap Idea', color: '#818cf8', bg_color: '#312e81' },
        z_index: elements.length + 1,
        created_at: now,
        updated_at: now,
      };
    }

    if (newElement) {
      const updated = [...elements, newElement];
      setElements(updated);
      setSelectedIds(new Set([newElement.id]));
      if (activeTool !== 'stamp') {
        setActiveTool('select');
      }
      pushHistory(updated, connections);
      persistChanges(updated);
    }
  };

  // HTML5 Drag & Drop Note from Sidebar onto Canvas
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dataRaw = e.dataTransfer.getData('application/json');
    if (!dataRaw) return;

    try {
      const data = JSON.parse(dataRaw);
      if (data.type === 'synapse-note' && data.noteId) {
        const { x, y } = screenToCanvas(e.clientX, e.clientY);
        const now = new Date().toISOString();

        const newCard: CanvasElement = {
          id: `el-${crypto.randomUUID().slice(0, 8)}`,
          type: 'note_card',
          x: Math.round(x - 120),
          y: Math.round(y - 70),
          width: 240,
          height: 140,
          content: {
            note_id: data.noteId,
            title: data.title || 'Referenced Note',
            text: `Live linked to ${data.title}.`,
          },
          z_index: elements.length + 1,
          created_at: now,
          updated_at: now,
        };

        const updated = [...elements, newCard];
        setElements(updated);
        setSelectedIds(new Set([newCard.id]));
        pushHistory(updated, connections);
        persistChanges(updated);
      }
    } catch (err) {}
  };

  // Element Mouse Down (Supports Ctrl/Shift Click Multi-Select & Multi-Element Drag)
  const handleElementMouseDown = (e: React.MouseEvent, element: CanvasElement) => {
    if (activeTool === 'eraser') {
      e.stopPropagation();
      handleDeleteElement(element.id);
      return;
    }

    // Hand tool or Spacebar pan active -> pan canvas instead of dragging element
    if (activeTool === 'hand' || isSpacePressed) {
      e.stopPropagation();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      // Allow drawing across element boundaries
      return;
    }

    e.stopPropagation();

    if (connectingFrom) {
      if (connectingFrom.id !== element.id) {
        const newConn: CanvasConnection = {
          id: `conn-${crypto.randomUUID().slice(0, 8)}`,
          from_element_id: connectingFrom.id,
          to_element_id: element.id,
          from_anchor: connectingFrom.anchor,
          to_anchor: 'left',
          style: 'curved',
          color: '#818cf8',
        };
        const updated = [...connections, newConn];
        setConnections(updated);
        setConnectingFrom(null);
        pushHistory(elements, updated);
        persistChanges(elements, updated);
      }
      return;
    }

    const isMultiKey = e.shiftKey || e.ctrlKey || e.metaKey;
    const wasAlreadySelected = selectedIds.has(element.id);

    let nextSelected = new Set(selectedIds);

    if (isMultiKey) {
      if (wasAlreadySelected) {
        nextSelected.delete(element.id);
      } else {
        nextSelected.add(element.id);
      }
      setSelectedIds(nextSelected);
    } else {
      if (!wasAlreadySelected) {
        nextSelected = new Set([element.id]);
        setSelectedIds(nextSelected);
      }
    }

    const movingIds = isMultiKey
      ? nextSelected
      : wasAlreadySelected
      ? selectedIds
      : new Set([element.id]);

    const initialPositions = new Map<string, { x: number; y: number }>();
    elements.forEach((el) => {
      if (movingIds.has(el.id)) {
        initialPositions.set(el.id, { x: el.x, y: el.y });
      }
    });

    const frameEnclosed: Array<{ id: string; dx: number; dy: number }> = [];
    elements.forEach((el) => {
      if (movingIds.has(el.id) && el.type === 'frame') {
        elements.forEach((child) => {
          if (
            !movingIds.has(child.id) &&
            child.x >= el.x &&
            child.x + child.width <= el.x + el.width &&
            child.y >= el.y &&
            child.y + child.height <= el.y + el.height
          ) {
            frameEnclosed.push({
              id: child.id,
              dx: child.x - el.x,
              dy: child.y - el.y,
            });
          }
        });
      }
    });

    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    setDragState({
      startX: canvasPos.x,
      startY: canvasPos.y,
      initialPositions,
      frameEnclosed,
      clickedId: element.id,
      wasAlreadySelected,
      isMultiKey,
      didMove: false,
    });
  };

  // Canvas Mouse Down: Freehand Pen / Highlighter, Pan, or Marquee Box Selection
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (templateModalOpenRef.current) {
      return;
    }

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      setIsDrawing(true);
      setCurrentDrawingPoints([canvasPos]);
      return;
    }

    if (activeTool === 'hand' || isSpacePressed || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    } else if (e.button === 0 && activeTool === 'select') {
      e.preventDefault();
      didMarqueeDragRef.current = false;
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      setSelectionBox({
        startX: canvasPos.x,
        startY: canvasPos.y,
        currentX: canvasPos.x,
        currentY: canvasPos.y,
      });
      initialSelectionRef.current = new Set(selectedIds);
    }
  };


  const handleMouseMove = (e: React.MouseEvent) => {
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    setMouseCanvasPos(canvasPos);

    // Freehand Drawing in progress
    if (isDrawing) {
      setCurrentDrawingPoints((prev) => [...prev, canvasPos]);
      return;
    }

    // Eraser drag across elements
    if (activeTool === 'eraser' && e.buttons === 1) {
      const hit = elements.find(
        (el) =>
          canvasPos.x >= el.x &&
          canvasPos.x <= el.x + el.width &&
          canvasPos.y >= el.y &&
          canvasPos.y <= el.y + el.height
      );
      if (hit) {
        handleDeleteElement(hit.id);
      }
      return;
    }

    if (isPanning) {
      setViewport((prev) => ({
        ...prev,
        x: prev.x + (e.clientX - panStart.x),
        y: prev.y + (e.clientY - panStart.y),
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Marquee Drag Box Selection
    if (selectionBox) {
      const curX = canvasPos.x;
      const curY = canvasPos.y;
      const dx = Math.abs(curX - selectionBox.startX);
      const dy = Math.abs(curY - selectionBox.startY);

      if (dx > 3 || dy > 3 || didMarqueeDragRef.current) {
        didMarqueeDragRef.current = true;
        setSelectionBox((prev) => (prev ? { ...prev, currentX: curX, currentY: curY } : null));

        const minX = Math.min(selectionBox.startX, curX);
        const maxX = Math.max(selectionBox.startX, curX);
        const minY = Math.min(selectionBox.startY, curY);
        const maxY = Math.max(selectionBox.startY, curY);

        const intersecting = elements
          .filter(
            (el) => el.x < maxX && el.x + el.width > minX && el.y < maxY && el.y + el.height > minY
          )
          .map((el) => el.id);

        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          const merged = new Set([...Array.from(initialSelectionRef.current), ...intersecting]);
          setSelectedIds(merged);
        } else {
          setSelectedIds(new Set(intersecting));
        }
      }
      return;
    }

    // Multi-Element Dragging
    if (dragState) {
      const deltaX = canvasPos.x - dragState.startX;
      const deltaY = canvasPos.y - dragState.startY;

      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        dragState.didMove = true;
      }

      setElements((prev) =>
        prev.map((el) => {
          const init = dragState.initialPositions.get(el.id);
          if (init) {
            return {
              ...el,
              x: Math.round(init.x + deltaX),
              y: Math.round(init.y + deltaY),
            };
          }
          const child = dragState.frameEnclosed.find((c) => c.id === el.id);
          if (child) {
            return {
              ...el,
              x: Math.round(el.x + deltaX),
              y: Math.round(el.y + deltaY),
            };
          }
          return el;
        })
      );
    }
  };

  const handleMouseUp = () => {
    // Finalize Freehand Drawing Stroke
    if (isDrawing) {
      setIsDrawing(false);
      if (currentDrawingPoints.length > 1) {
        const xs = currentDrawingPoints.map((p) => p.x);
        const ys = currentDrawingPoints.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const normalizedPoints = currentDrawingPoints.map((p) => ({
          x: Math.round(p.x - minX),
          y: Math.round(p.y - minY),
        }));

        const now = new Date().toISOString();
        const strokeW = activeTool === 'highlighter' ? drawingWidth * 3.5 : drawingWidth;

        const newDrawing: CanvasElement = {
          id: `el-draw-${crypto.randomUUID().slice(0, 8)}`,
          type: 'drawing',
          x: Math.round(minX),
          y: Math.round(minY),
          width: Math.max(Math.round(maxX - minX), 16),
          height: Math.max(Math.round(maxY - minY), 16),
          content: {
            tool_type: activeTool as 'pen' | 'highlighter',
            stroke_color: drawingColor,
            stroke_width: strokeW,
            points: normalizedPoints,
          },
          z_index: elements.length + 5,
          created_at: now,
          updated_at: now,
        };

        const updated = [...elements, newDrawing];
        setElements(updated);
        pushHistory(updated, connections);
        persistChanges(updated);
      }
      setCurrentDrawingPoints([]);
      return;
    }

    if (dragState) {
      if (
        !dragState.didMove &&
        !dragState.isMultiKey &&
        dragState.wasAlreadySelected &&
        selectedIds.size > 1
      ) {
        setSelectedIds(new Set([dragState.clickedId]));
      } else if (dragState.didMove) {
        pushHistory(elements, connections);
        persistChanges();
      }
      setDragState(null);
    }

    if (selectionBox) {
      setSelectionBox(null);
    }

    if (isPanning) {
      setIsPanning(false);
      persistChanges();
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragState || selectionBox || isPanning || isDrawing) {
        handleMouseUp();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [dragState, selectionBox, isPanning, isDrawing]);

  const handleStartConnect = (elementId: string, anchor: 'top' | 'right' | 'bottom' | 'left') => {
    setConnectingFrom({ id: elementId, anchor });
  };

  const handlePromoteToNote = async (stickyElement: CanvasElement) => {
    const title = stickyElement.content.text?.split('\n')[0]?.slice(0, 30) || 'Promoted Note';
    const note = await createNote({
      workspaceId,
      title,
      icon: '📝',
    });

    const updatedElements = elements.map((el) =>
      el.id === stickyElement.id
        ? {
            ...el,
            type: 'note_card' as const,
            content: {
              note_id: note.id,
              title: note.title,
              text: stickyElement.content.text || '',
            },
          }
        : el
    );

    setElements(updatedElements);
    pushHistory(updatedElements, connections);
    persistChanges(updatedElements);
  };

  const handleAIExpandNode = async (nodeElement: CanvasElement) => {
    try {
      const prompt = nodeElement.content.text || 'Core Concept';
      const res = await fetch('/api/ai/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      const suggestions: string[] = data.suggestions || [
        `Key Component 1`,
        `Architecture Layer 2`,
        `Implementation Step 3`,
      ];

      const now = new Date().toISOString();
      const newChildElements: CanvasElement[] = [];
      const newChildConnections: CanvasConnection[] = [];

      suggestions.slice(0, 3).forEach((text, i) => {
        const childId = `el-${crypto.randomUUID().slice(0, 8)}`;
        const yOffset = (i - 1) * 70;

        const autoDims = getNodeAutoDimensions({
          id: childId,
          type: 'mindmap_node',
          x: 0,
          y: 0,
          width: 180,
          height: 48,
          content: { text, color: '#34d399', bg_color: '#064e3b' },
          z_index: 0,
          created_at: now,
          updated_at: now,
        });

        newChildElements.push({
          id: childId,
          type: 'mindmap_node',
          x: nodeElement.x + (nodeElement.width || 180) + 100,
          y: nodeElement.y + yOffset,
          width: autoDims.width,
          height: autoDims.height,
          content: { text, color: '#34d399', bg_color: '#064e3b' },
          parent_id: nodeElement.id,
          z_index: elements.length + i + 1,
          created_at: now,
          updated_at: now,
        });

        newChildConnections.push({
          id: `conn-${crypto.randomUUID().slice(0, 8)}`,
          from_element_id: nodeElement.id,
          to_element_id: childId,
          from_anchor: 'right',
          to_anchor: 'left',
          style: 'curved',
          color: '#34d399',
        });
      });

      const updatedElements = [...elements, ...newChildElements];
      const updatedConnections = [...connections, ...newChildConnections];
      setElements(updatedElements);
      setConnections(updatedConnections);
      pushHistory(updatedElements, updatedConnections);
      persistChanges(updatedElements, updatedConnections);
    } catch (e) {}
  };

  // One-Click Tidy Up & Auto-Layout
  const handleTidyUp = () => {
    const nonFrames = elements.filter((el) => el.type !== 'frame');
    const cols = Math.max(Math.ceil(Math.sqrt(nonFrames.length)), 2);
    const startX = 200;
    const startY = 150;
    const colSpacing = 260;
    const rowSpacing = 200;

    const tidied = elements.map((el) => {
      const idx = nonFrames.findIndex((nf) => nf.id === el.id);
      if (idx !== -1) {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        return {
          ...el,
          x: startX + col * colSpacing,
          y: startY + row * rowSpacing,
        };
      }
      return el;
    });

    setElements(tidied);
    pushHistory(tidied, connections);
    persistChanges(tidied);
  };

  const handleUpdateElement = (id: string, updates: Partial<CanvasElement>) => {
    const updated = elements.map((el) => {
      if (el.id === id) {
        const merged = { ...el, ...updates };
        const autoDims = getNodeAutoDimensions(merged);
        return {
          ...merged,
          width: autoDims.width,
          height: autoDims.height,
        };
      }
      return el;
    });
    setElements(updated);
    persistChanges(updated);
  };

  const handleDeleteElement = (id: string) => {
    const updatedElements = elements.filter((el) => el.id !== id);
    const updatedConnections = connections.filter(
      (c) => c.from_element_id !== id && c.to_element_id !== id
    );
    setElements(updatedElements);
    setConnections(updatedConnections);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    pushHistory(updatedElements, updatedConnections);
    persistChanges(updatedElements, updatedConnections);
  };

  const handleExport = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(whiteboard, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `${whiteboard.title.toLowerCase().replace(/\s+/g, '-')}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleClear = () => {
    if (confirm('Clear all items on this whiteboard?')) {
      setElements([]);
      setConnections([]);
      setSelectedIds(new Set());
      pushHistory([], []);
      persistChanges([], []);
    }
  };

  const handleInsertTemplate = (
    tplElements: CanvasElement[],
    tplConnections: CanvasConnection[]
  ) => {
    const updatedElements = [...elements, ...tplElements];
    const updatedConnections = [...connections, ...tplConnections];
    setElements(updatedElements);
    setConnections(updatedConnections);
    pushHistory(updatedElements, updatedConnections);
    persistChanges(updatedElements, updatedConnections);
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleCanvasClick}
      onDoubleClick={handleDoubleClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`w-full h-full relative overflow-hidden bg-background text-foreground select-none ${
        activeTool === 'hand' || isSpacePressed || isPanning
          ? isPanning
            ? 'cursor-grabbing'
            : 'cursor-grab'
          : activeTool === 'pen' || activeTool === 'highlighter'
          ? 'cursor-crosshair'
          : activeTool === 'eraser'
          ? 'cursor-not-allowed'
          : 'cursor-default'
      }`}
    >

      {/* Interactive Radar Minimap */}
      <CanvasMinimap
        elements={elements}
        viewport={viewport}
        onCenterAt={(cx, cy) => {
          const screenW = window.innerWidth - 240;
          const screenH = window.innerHeight;
          setViewport((prev) => ({
            ...prev,
            x: screenW / 2 - cx * prev.zoom,
            y: screenH / 2 - cy * prev.zoom,
          }));
        }}
      />

      {/* Dot Grid Background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
        <defs>
          <pattern
            id="dot-grid"
            width={32 * viewport.zoom}
            height={32 * viewport.zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${viewport.x % (32 * viewport.zoom)}, ${
              viewport.y % (32 * viewport.zoom)
            })`}
          >
            <circle cx="2" cy="2" r="1.2" fill="currentColor" className="text-muted-foreground/40" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>

      {/* Transform Layer for Pan & Zoom */}
      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        }}
      >
        {/* SVG Layer: Connections & Freehand Drawings */}
        <svg className="absolute top-0 left-0 w-[8000px] h-[8000px] pointer-events-none z-10">
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--primary)" />
            </marker>
          </defs>

          {/* SVG Connector Lines */}
          {connections.map((conn) => {
            const fromEl = elements.find((e) => e.id === conn.from_element_id);
            const toEl = elements.find((e) => e.id === conn.to_element_id);
            if (!fromEl || !toEl) return null;

            const fromDims = getNodeAutoDimensions(fromEl);
            const toDims = getNodeAutoDimensions(toEl);

            const fromW = Math.max(fromEl.width || 0, fromDims.width);
            const fromH = Math.max(fromEl.height || 0, fromDims.height);
            const toH = Math.max(toEl.height || 0, toDims.height);

            const x1 = fromEl.x + fromW;
            const y1 = fromEl.y + fromH / 2;
            const x2 = toEl.x;
            const y2 = toEl.y + toH / 2;

            const dx = Math.max(Math.abs(x2 - x1) * 0.5, 40);
            const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

            return (
              <path
                key={conn.id}
                d={pathD}
                fill="none"
                stroke={conn.color || '#818cf8'}
                strokeWidth="2.5"
                strokeDasharray="4 3"
                markerEnd="url(#arrowhead)"
                className="transition-all"
              />
            );
          })}

          {/* Active Drag-to-Connect Preview Line */}
          {connectingFrom &&
            (() => {
              const source = elements.find((e) => e.id === connectingFrom.id);
              if (!source) return null;
              const x1 = source.x + source.width;
              const y1 = source.y + source.height / 2;
              const x2 = mouseCanvasPos.x;
              const y2 = mouseCanvasPos.y;
              return (
                <path
                  d={`M ${x1} ${y1} L ${x2} ${y2}`}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                  markerEnd="url(#arrowhead)"
                />
              );
            })()}

          {/* Saved Drawing Strokes */}
          {elements
            .filter((el) => el.type === 'drawing' && el.content.points)
            .map((el) => {
              const pathD = getSvgPathFromPoints(el.content.points || [], el.x, el.y);
              const isSelected = selectedIds.has(el.id);
              const isHighlighter = el.content.tool_type === 'highlighter';

              return (
                <path
                  key={el.id}
                  d={pathD}
                  fill="none"
                  stroke={el.content.stroke_color || '#818cf8'}
                  strokeWidth={el.content.stroke_width || 3}
                  strokeOpacity={isHighlighter ? 0.45 : 1.0}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`pointer-events-none transition-all ${
                    isSelected ? 'filter drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]' : ''
                  }`}
                />
              );
            })}

          {/* Real-Time Drawing In-Progress Preview */}
          {isDrawing && currentDrawingPoints.length > 1 && (
            <path
              d={getSvgPathFromPoints(currentDrawingPoints)}
              fill="none"
              stroke={drawingColor}
              strokeWidth={activeTool === 'highlighter' ? drawingWidth * 3.5 : drawingWidth}
              strokeOpacity={activeTool === 'highlighter' ? 0.45 : 1.0}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none"
            />
          )}
        </svg>

        {/* Marquee Drag Selection Box (Figma Style) */}
        {selectionBox && didMarqueeDragRef.current && (
          <div
            className="absolute border-2 border-indigo-400 bg-indigo-500/25 rounded pointer-events-none z-50 transition-none shadow-lg shadow-indigo-500/20"
            style={{
              left: `${Math.min(selectionBox.startX, selectionBox.currentX)}px`,
              top: `${Math.min(selectionBox.startY, selectionBox.currentY)}px`,
              width: `${Math.abs(selectionBox.currentX - selectionBox.startX)}px`,
              height: `${Math.abs(selectionBox.currentY - selectionBox.startY)}px`,
            }}
          />
        )}

        {/* Spatial Elements DOM Layer */}
        {elements.map((el) => {
          const isSelected = selectedIds.has(el.id);
          const isPanMode = activeTool === 'hand' || isSpacePressed;
          const autoDims = getNodeAutoDimensions(el);
          const renderWidth = Math.max(el.width || 0, autoDims.width);
          const renderHeight = Math.max(el.height || 0, autoDims.height);

          return (
            <div
              key={el.id}
              onMouseDown={(e) => handleElementMouseDown(e, el)}
              onClick={(e) => {
                e.stopPropagation();
                if (isPanMode) return;
                if (activeTool === 'eraser') {
                  handleDeleteElement(el.id);
                  return;
                }
                if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                  setSelectedIds(new Set([el.id]));
                }
              }}
              className={`absolute transition-shadow ${
                isPanMode ? (isPanning ? 'cursor-grabbing' : 'cursor-grab select-none') : ''
              }`}
              style={{
                left: `${el.x}px`,
                top: `${el.y}px`,
                width: `${renderWidth}px`,
                height: `${renderHeight}px`,
                minWidth: `${autoDims.minW}px`,
                minHeight: `${autoDims.minH}px`,
                zIndex: el.type === 'frame' ? 0 : el.z_index,
              }}
            >
              <div className={`w-full h-full ${isPanMode ? 'pointer-events-none' : ''}`}>
                {el.type === 'sticky' && (
                  <StickyNoteElement
                    element={el}
                    isSelected={isSelected}
                    onUpdate={(updates) => handleUpdateElement(el.id, updates)}
                    onDelete={() => handleDeleteElement(el.id)}
                    onPromoteToNote={() => handlePromoteToNote(el)}
                    onStartConnect={(anchor) => handleStartConnect(el.id, anchor)}
                  />
                )}

                {el.type === 'stamp' && (
                  <StampElement
                    element={el}
                    isSelected={isSelected}
                    onUpdate={(updates) => handleUpdateElement(el.id, updates)}
                    onDelete={() => handleDeleteElement(el.id)}
                  />
                )}

                {el.type === 'text' && (
                  <TextElement
                    element={el}
                    isSelected={isSelected}
                    onUpdate={(updates) => handleUpdateElement(el.id, updates)}
                    onDelete={() => handleDeleteElement(el.id)}
                  />
                )}

                {el.type === 'shape' && (
                  <ShapeElement
                    element={el}
                    isSelected={isSelected}
                    onUpdate={(updates) => handleUpdateElement(el.id, updates)}
                    onStartConnect={(anchor) => handleStartConnect(el.id, anchor)}
                  />
                )}

                {el.type === 'frame' && (
                  <FrameElement
                    element={el}
                    isSelected={isSelected}
                    onUpdate={(updates) => handleUpdateElement(el.id, updates)}
                    onDelete={() => handleDeleteElement(el.id)}
                  />
                )}

                {el.type === 'drawing' && (
                  <div
                    className={`w-full h-full cursor-move rounded border border-transparent transition-all ${
                      isSelected ? 'border-indigo-400/60 bg-indigo-500/5' : 'hover:border-white/20'
                    }`}
                    title="Drawing stroke (click to select/move)"
                  />
                )}

                {el.type === 'note_card' && (
                  <NoteCardElement
                    element={el}
                    workspaceId={workspaceId}
                    isSelected={isSelected}
                    onUpdate={(updates) => handleUpdateElement(el.id, updates)}
                    onDelete={() => handleDeleteElement(el.id)}
                    onStartConnect={(anchor) => handleStartConnect(el.id, anchor)}
                  />
                )}

                {el.type === 'mindmap_node' && (
                  <MindmapNodeElement
                    element={el}
                    isSelected={isSelected}
                    onUpdate={(updates) => handleUpdateElement(el.id, updates)}
                    onDelete={() => handleDeleteElement(el.id)}
                    onAIExpand={() => handleAIExpandNode(el)}
                    onStartConnect={(anchor) => handleStartConnect(el.id, anchor)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Multi-Selection Action Pill */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 select-none text-foreground">
          <span className="text-xs font-semibold text-heading px-1">
            {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} selected
          </span>
          <div className="w-px h-3.5 bg-border mx-0.5" />
          <button
            type="button"
            onClick={handleDuplicateSelected}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
            title="Duplicate (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5 text-primary" />
            <span>Duplicate</span>
            <kbd className="text-[10px] font-mono text-muted-foreground/60 ml-0.5">Ctrl+D</kbd>
          </button>
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Delete (Del / Backspace)"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete</span>
            <kbd className="text-[10px] font-mono text-muted-foreground/60 ml-0.5">Del</kbd>
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
            title="Deselect All (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Bottom Toolbar */}
      <CanvasToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        zoom={viewport.zoom}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onTidyUp={handleTidyUp}
        onOpenTemplates={() => setTemplateModalOpen(true)}
        drawingColor={drawingColor}
        setDrawingColor={setDrawingColor}
        drawingWidth={drawingWidth}
        setDrawingWidth={setDrawingWidth}
        activeStamp={activeStamp}
        setActiveStamp={setActiveStamp}
        mode={mode}
        onZoomIn={() => {
          const newZ = Math.min(viewport.zoom * 1.15, 3.0);
          setViewport((prev) => ({ ...prev, zoom: newZ }));
          persistChanges(elements, connections, { ...viewport, zoom: newZ });
        }}
        onZoomOut={() => {
          const newZ = Math.max(viewport.zoom * 0.85, 0.2);
          setViewport((prev) => ({ ...prev, zoom: newZ }));
          persistChanges(elements, connections, { ...viewport, zoom: newZ });
        }}
        onResetZoom={() => {
          setViewport((prev) => ({ ...prev, zoom: 1.0 }));
          persistChanges(elements, connections, { ...viewport, zoom: 1.0 });
        }}
        onFitContent={() => {
          setViewport({ x: 100, y: 80, zoom: 0.9 });
          persistChanges(elements, connections, { x: 100, y: 80, zoom: 0.9 });
        }}
        onExport={handleExport}
        onClear={handleClear}
      />

      {/* 1-Click FigJam Template Modal */}
      <FigJamTemplateModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        onInsert={handleInsertTemplate}
      />
    </div>
  );
};
