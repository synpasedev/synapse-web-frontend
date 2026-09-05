export interface ASTTextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  link?: string;
  code?: boolean;
}

export type ASTBlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bullet'
  | 'numbered'
  | 'code'
  | 'quote'
  | 'divider'
  | 'callout'
  | 'table';

export interface ASTBlock {
  id: string;
  type: ASTBlockType;
  runs: ASTTextRun[];
  properties?: Record<string, any>;
  tableData?: ASTTextRun[][][]; // rows -> cells -> runs
}

export interface CanonicalDoc {
  title: string;
  blocks: ASTBlock[];
}
