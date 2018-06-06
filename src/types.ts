import { OrderedSet } from 'immutable';
import { EditorState } from 'draft-js';

/** Describes the attributes of the characters immediately before and after an offset in a ContentBlock. */
export type NeighboringCharacterAttributes<T> = { before: T | undefined, after: T | undefined };

/**
 * Gets attributes for inserted text based on attributes of characters before
 * and after the insertion position.
 * @param characters The attributes that the neighboring characters at the
 * insertion position will have once preceding edits have been applied.
 */
export type InsertionCallback<T> = (characters: NeighboringCharacterAttributes<T>) => T;

/**
 * Describes where the insertion should occur relative to a selection
 * edge in the case that the insertion takes place at the same offset
 * as an edge of the selection.
 */
export enum SelectionEdgeHandling {
  /** Inserts the text before the selection edge. */
  InsertBefore = 'insert-before',
  /** Inserts the text after the selection edge. */
  InsertAfter = 'insert-after',
  /**
   * Inserts the text inside a non-collapsed selection; that is, after
   * a leading selection edge and before a trailing selection edge.
   * Falls back to `InsertBefore` if the selection is not collapsed.
   */
  InsertInside = 'insert-inside',
  /**
   * Inserts the text outside a non-collapsed selection; that is, before
   * a leading selection edge and after a trailing selection edge. Falls
   * back to `InsertBefore` if the selection is not collapsed.
   */
  InsertOutside = 'insert-outside'
};

/** Describes text inserted by a SpliceEdit. */
export type Insertion = {
  /** The characters to insert. */
  text: string;
  /** The inline styles to apply to the inserted text. */
  style?: OrderedSet<string> | InsertionCallback<OrderedSet<string>>;
  /** The key of the Draft Entity to apply to the inserted text. */
  entityKey?: string | InsertionCallback<string>;
  /**
   * Defines where the insertion should occur relative to a selection edge
   * in the case that the insertion takes place at the same offset as an
   * edge of the selection.
   */
  selectionEdgeHandling?: SelectionEdgeHandling;
};

export interface BaseEdit {
  /** The type identifier for the edit. */
  type: string;
  /** The key of the Draft ContentBlock within which the edit should be performed. */
  blockKey: string;
  /** The character position within the block where the edit should start. */
  offset: number;
  /**
   * Defines an order of precedence that will be used to decide the order in which
   * edits are applied in the case that multiple edits have the same `offset`.
   * Edits with higher precedence get applied first. If edits have the same offset
   * and the same precedence, they are applied in the order they were added to the
   * transaction.
   */
  precedence?: number;
}

/**
 * An edit within a block that can delete and insert characters at a specific position.
 */
export interface SpliceEdit extends BaseEdit {
  type: 'splice',
  /** The number of characters to remove, starting at `offset`. */
  deletionLength?: number;
  /** The description of the text to insert at `offset`. */
  insertion?: Insertion;
};

export type Edit = SpliceEdit;

export interface Transaction {
  size: number;
  addEdit(edit: Edit): Transaction;
  apply(editorState: EditorState): EditorState;
};

export type ChangeType = typeof EditorState.push extends (_: any, __: any, changeType: infer T) => any ? T : never;