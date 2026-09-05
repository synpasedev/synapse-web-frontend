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
import { Copy, Trash2, X } from 'lucide-react';

interface HistorySnapshot {
  elements: CanvasElement[];
  connections: CanvasConnection[];
}

export const WhiteboardCanvas: React.FC<{
  whiteboard: Whiteboard;
  workspaceId: string;
}> = ({ whiteboard, workspaceId }) => {
  const { mutate: updateWhiteboard } = useMutateWhiteboard(whiteboard.id);
  const { mutateAsync: createNote } = useCreateNote();

  const [elements, setElements] = useState<CanvasElement[]>(whiteboard.elements || []);
  const [connections, setConnections] = useState<CanvasConnection[]>(whiteboard.connections || []);
  const [viewport, setViewport] = useState(whiteboard.viewport || { x: 0, y: 0, zoom: 1 });
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');

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
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setElements(prev.elements);
      setConnections(prev.connections);
      persistChanges(prev.elements, prev.connections);
    }
  }, [historyIndex, history, persistChanges]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setElements(next.elements);
      setConnections(next.connections);
      persistChanges(next.elements, next.connections);
    }
  }, [historyIndex, history, persistChanges]);

  // Delete All Selected Elements
  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const updatedElements = elements.filter((el) => !selectedIds.has(el.id));
    const updatedConnections = connections.filter(
      (c) => !selectedIds.has(c.from_element_id) && !selectedIds.has(c.to_element_id)
    );
    setElements(updatedElements);
    setConnections(updatedConnections);
    setSelectedIds(new Set());
    pushHistory(updatedElements, updatedConnections);
    persistChanges(updatedElements, updatedConnections);
  }, [selectedIds, elements, connections, pushHistory, persistChanges]);

  // Duplicate All Selected Elements (Ctrl+D)
  const handleDuplicateSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const idMap = new Map<string, string>();
    const now = new Date().toISOString();
    const duplicatedElements: CanvasElement[] = [];

    // Duplicate nodes offset by +30px, +30px
    elements.forEach((el) => {
      if (selectedIds.has(el.id)) {
        const newId = `el-${crypto.randomUUID().slice(0, 8)}`;
        idMap.set(el.id, newId);
        duplicatedElements.push({
          ...el,
          id: newId,
          x: el.x + 30,
          y: el.y + 30,
          created_at: now,
          updated_at: now,
        });
      }
    });

    // Duplicate connections between duplicated nodes
    const duplicatedConnections: CanvasConnection[] = [];
    connections.forEach((conn) => {
      const newFrom = idMap.get(conn.from_element_id);
      const newTo = idMap.get(conn.to_element_id);
      if (newFrom && newTo) {
        duplicatedConnections.push({
          ...conn,
          id: `conn-${crypto.randomUUID().slice(0, 8)}`,
          from_element_id: newFrom,
          to_element_id: newTo,
        });
      }
    });

    const updatedElements = [...elements, ...duplicatedElements];
    const updatedConnections = [...connections, ...duplicatedConnections];
    setElements(updatedElements);
    setConnections(updatedConnections);
    setSelectedIds(new Set(duplicatedElements.map((e) => e.id)));
    pushHistory(updatedElements, updatedConnections);
    persistChanges(updatedElements, updatedConnections);
  }, [selectedIds, elements, connections, pushHistory, persistChanges]);

  // Nudge Selected Elements with Arrow Keys
  const handleNudgeSelected = useCallback(
    (dx: number, dy: number) => {
      if (selectedIds.size === 0) return;
      const updated = elements.map((el) =>
        selectedIds.has(el.id)
          ? { ...el, x: Math.round(el.x + dx), y: Math.round(el.y + dy) }
          : el
      );
      setElements(updated);
      persistChanges(updated);
    },
    [selectedIds, elements, persistChanges]
  );

  // Figma-like Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('[contenteditable="true"]'))
      ) {
        return;
      }

      const cmdOrCtrl = e.ctrlKey || e.metaKey;

      // Undo / Redo
      if (cmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (cmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Ctrl + A: Select All Elements
      if (cmdOrCtrl && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedIds(new Set(elements.map((el) => el.id)));
        return;
      }

      // Ctrl + D: Duplicate Selected Elements
      if (cmdOrCtrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
        return;
      }

      // Delete or Backspace: Delete All Selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
        return;
      }

      // Escape: Deselect All / Cancel Connector
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedIds(new Set());
        setConnectingFrom(null);
        return;
      }

      // Arrow Keys: Nudge Selected Elements (Shift for 10px, default 2px)
      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        if (selectedIds.size > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 2;
          let dx = 0;
          let dy = 0;
          if (e.key === 'ArrowUp') dy = -step;
          if (e.key === 'ArrowDown') dy = step;
          if (e.key === 'ArrowLeft') dx = -step;
          if (e.key === 'ArrowRight') dx = step;
          handleNudgeSelected(dx, dy);
          return;
        }
      }

      // Single-Key Tool Switching
      if (!cmdOrCtrl && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'v') setActiveTool('select');
        else if (k === 'h') setActiveTool('hand');
        else if (k === 's') setActiveTool('sticky');
        else if (k === 'n') setActiveTool('note_card');
        else if (k === 'm') setActiveTool('mindmap');
        else if (k === 'f') setActiveTool('frame');
        else if (k === 'r') setActiveTool('rectangle');
        else if (k === 'o') setActiveTool('circle');
        else if (k === 't') setActiveTool('text');
        else if (k === 'a') setActiveTool('arrow');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    elements,
    selectedIds,
    handleUndo,
    handleRedo,
    handleDeleteSelected,
    handleDuplicateSelected,
    handleNudgeSelected,
  ]);

  // Wheel Zoom & Pan
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newZoom = Math.min(Math.max(viewport.zoom * zoomFactor, 0.15), 3.0);
      const newViewport = { ...viewport, zoom: newZoom };
      setViewport(newViewport);
      persistChanges(elements, connections, newViewport);
    } else {
      const newViewport = {
        ...viewport,
        x: viewport.x - e.deltaX,
        y: viewport.y - e.deltaY,
      };
      setViewport(newViewport);
    }
  };

  // Double Click Canvas = Quick Sticky Note Creation
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (dragState?.didMove) return;
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const id = `el-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const newSticky: CanvasElement = {
      id,
      type: 'sticky',
      x: Math.round(x - 100),
      y: Math.round(y - 80),
      width: 200,
      height: 180,
      content: { text: '', color: '#fef08a', bg_color: '#713f12' },
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

    // If user just performed a marquee drag, do NOT deselect!
    if (didMarqueeDragRef.current) {
      didMarqueeDragRef.current = false;
      return;
    }

    if (activeTool === 'select' || activeTool === 'hand') {
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
        x: Math.round(x - 100),
        y: Math.round(y - 80),
        width: 200,
        height: 180,
        content: { text: '', color: '#fef08a', bg_color: '#713f12' },
        z_index: elements.length + 1,
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
    } else if (activeTool === 'frame') {
      newElement = {
        id,
        type: 'frame',
        x: Math.round(x - 200),
        y: Math.round(y - 150),
        width: 400,
        height: 300,
        content: { title: 'Project Section' },
        z_index: 0,
        created_at: now,
        updated_at: now,
      };
    } else if (activeTool === 'rectangle' || activeTool === 'circle') {
      newElement = {
        id,
        type: 'shape',
        x: Math.round(x - 80),
        y: Math.round(y - 80),
        width: 160,
        height: 160,
        content: { shape_type: activeTool, color: '#6366f1', text: '' },
        z_index: elements.length + 1,
        created_at: now,
        updated_at: now,
      };
    } else if (activeTool === 'text') {
      newElement = {
        id,
        type: 'text',
        x: Math.round(x - 60),
        y: Math.round(y - 20),
        width: 140,
        height: 40,
        content: { text: 'Text Label', font_size: 16 },
        z_index: elements.length + 1,
        created_at: now,
        updated_at: now,
      };
    }

    if (newElement) {
      const updated = [...elements, newElement];
      setElements(updated);
      setSelectedIds(new Set([newElement.id]));
      setActiveTool('select');
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

    // Determine all moving elements
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

    // Enclosed frame elements
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

  // Canvas Mouse Down: Pan or Marquee Box Selection
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'hand' || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
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
    if (dragState) {
      if (
        !dragState.didMove &&
        !dragState.isMultiKey &&
        dragState.wasAlreadySelected &&
        selectedIds.size > 1
      ) {
        // Collapses multi-selection to clicked element if just clicked without dragging
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

  // Global window mouseup listener ensures drag/marquee always cleanly finalizes
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragState || selectionBox || isPanning) {
        handleMouseUp();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [dragState, selectionBox, isPanning]);

  const handleStartConnect = (elementId: string, anchor: 'top' | 'right' | 'bottom' | 'left') => {
    setConnectingFrom({ id: elementId, anchor });
  };

  // Convert Sticky Note to Full Synapse Document
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

  // AI Auto-Expand Mindmap Node
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

        newChildElements.push({
          id: childId,
          type: 'mindmap_node',
          x: nodeElement.x + nodeElement.width + 100,
          y: nodeElement.y + yOffset,
          width: 170,
          height: 48,
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
    const updated = elements.map((el) => (el.id === id ? { ...el, ...updates } : el));
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

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleCanvasClick}
      onDoubleClick={handleDoubleClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`w-full h-full relative overflow-hidden bg-[#0e0f14] select-none ${
        activeTool === 'hand' || isPanning
          ? 'cursor-grab active:cursor-grabbing'
          : 'cursor-crosshair'
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
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
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
            <circle cx="2" cy="2" r="1.2" fill="#818cf8" />
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
        {/* SVG Connector Lines */}
        <svg className="absolute top-0 left-0 w-[8000px] h-[8000px] pointer-events-none z-0">
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#818cf8" />
            </marker>
          </defs>

          {connections.map((conn) => {
            const fromEl = elements.find((e) => e.id === conn.from_element_id);
            const toEl = elements.find((e) => e.id === conn.to_element_id);
            if (!fromEl || !toEl) return null;

            const x1 = fromEl.x + fromEl.width;
            const y1 = fromEl.y + fromEl.height / 2;
            const x2 = toEl.x;
            const y2 = toEl.y + toEl.height / 2;

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

        {/* Spatial Elements */}
        {elements.map((el) => {
          const isSelected = selectedIds.has(el.id);

          return (
            <div
              key={el.id}
              onMouseDown={(e) => handleElementMouseDown(e, el)}
              onClick={(e) => {
                e.stopPropagation();
                if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                  setSelectedIds(new Set([el.id]));
                }
              }}
              className="absolute transition-shadow"
              style={{
                left: `${el.x}px`,
                top: `${el.y}px`,
                width: `${el.width}px`,
                height: `${el.height}px`,
                zIndex: el.type === 'frame' ? 0 : el.z_index,
              }}
            >
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
            </div>
          );
        })}
      </div>

      {/* Floating Multi-Selection Action Pill */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#181922]/95 backdrop-blur-xl border border-border/80 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 select-none">
          <span className="text-xs font-semibold text-foreground px-1">
            {selectedIds.size} {selectedIds.size === 1 ? 'node' : 'nodes'} selected
          </span>
          <div className="w-px h-3.5 bg-border/60 mx-0.5" />
          <button
            type="button"
            onClick={handleDuplicateSelected}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
            title="Duplicate (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5 text-indigo-400" />
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
    </div>
  );
};
