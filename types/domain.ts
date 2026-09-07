export type BlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bullet_list'
  | 'numbered_list'
  | 'todo_list'
  | 'toggle'
  | 'callout'
  | 'code'
  | 'table'
  | 'divider'
  | 'quote'
  | 'database_embed';

export interface Note {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  title: string;
  icon: string | null;
  cover_url: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  is_public: boolean;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface Block {
  id: string;
  note_id: string;
  workspace_id: string;
  parent_block_id: string | null;
  type: BlockType;
  content: {
    text?: string;
    nodes?: any[];
    [key: string]: any;
  };
  properties: {
    icon?: string;
    language?: string;
    collapsed?: boolean;
    color?: string;
    [key: string]: any;
  };
  sort_order: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface Link {
  id: string;
  workspace_id: string;
  source_note_id: string;
  source_block_id: string | null;
  target_note_id: string;
  created_at: string;
  target_note?: Pick<Note, 'id' | 'title' | 'icon'>;
  source_note?: Pick<Note, 'id' | 'title' | 'icon'>;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  icon: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  role?: 'owner' | 'admin' | 'editor' | 'viewer';
}

export interface Template {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  icon: string;
  content: {
    title: string;
    blocks: Array<{
      type: BlockType;
      content: { text?: string; [key: string]: any };
      properties?: Record<string, any>;
    }>;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type PropertyType = 'text' | 'number' | 'select' | 'multi-select' | 'date' | 'checkbox' | 'relation';

export interface DatabaseProperty {
  id: string;
  name: string;
  type: PropertyType;
  options?: Array<{ id: string; label: string; color: string }>;
}

export interface DatabaseRow {
  id: string;
  database_id: string;
  properties: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Database {
  id: string;
  workspace_id: string;
  note_id?: string;
  title: string;
  icon?: string;
  properties: DatabaseProperty[];
  rows: DatabaseRow[];
  created_at: string;
  updated_at: string;
}

// -------------------------------------------------------------
// INFINITE CANVAS & WHITEBOARD DOMAIN TYPES
// -------------------------------------------------------------

export type CanvasElementType =
  | 'sticky'
  | 'note_card'
  | 'shape'
  | 'text'
  | 'mindmap_node'
  | 'drawing'
  | 'frame'
  | 'stamp';

export type ShapeType = 'rectangle' | 'circle' | 'diamond' | 'pill' | 'triangle' | 'star';
export type ArrowStyle = 'curved' | 'straight' | 'orthogonal';

export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  content: {
    text?: string;
    title?: string;
    note_id?: string;
    shape_type?: ShapeType;
    color?: string;
    bg_color?: string;
    stroke_color?: string;
    stroke_width?: number;
    font_size?: number;
    points?: Array<{ x: number; y: number }>;
    tool_type?: 'pen' | 'highlighter';
    emoji?: string;
    count?: number;
    author?: string;
    [key: string]: any;
  };
  parent_id?: string | null;
  frame_id?: string | null;
  z_index: number;
  created_at: string;
  updated_at: string;
}

export interface CanvasConnection {
  id: string;
  from_element_id: string;
  to_element_id: string;
  from_anchor?: 'top' | 'right' | 'bottom' | 'left';
  to_anchor?: 'top' | 'right' | 'bottom' | 'left';
  style: ArrowStyle;
  label?: string;
  color?: string;
}

export interface Whiteboard {
  id: string;
  workspace_id: string;
  title: string;
  icon: string;
  board_type?: 'whiteboard' | 'canvas';
  viewport: { x: number; y: number; zoom: number };
  elements: CanvasElement[];
  connections: CanvasConnection[];
  created_at: string;
  updated_at: string;
}

