import { OrderedSet } from 'immutable';

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
  InsertBefore = 1 << 0,
  /** Inserts the text after the selection edge. */
  InsertAfter = 1 << 1,
  /**
   * Inserts the text inside a non-collapsed selection; that is, after
   * a leading selection edge and before a trailing selection edge.
   * Falls back to `InsertBefore` if the selection is not collapsed.
   */
  InsertInside = 1 << 2,
  /**
   * Inserts the text outside a non-collapsed selection; that is, before
   * a leading selection edge and after a trailing selection edge. Falls
   * back to `InsertBefore` if the selection is not collapsed.
   */
  InsertOutside = 1 << 3
};

/** Describes text inserted by a SliceEdit. */
export type Insertion = {
  /** The characters to insert. */
  text: string;
  /** The inline styles to apply to the inserted text. */
  style?: OrderedSet<string> | InsertionCallback<OrderedSet<string>>;
  /** The key of the Draft Entity to apply to the inserted text. */
  entityKey?: string | null | InsertionCallback<string | null>;
  /**
   * Defines where the insertion should occur relative to a selection edge
   * in the case that the insertion takes place at the same offset as an
   * edge of the selection.
   */
  selectionEdgeHandling?: SelectionEdgeHandling;
};

/**
 * An edit within a block that can delete and insert characters at a specific position.
 */
export type SliceEdit = {
  type: 'slice',
  /** The key of the Draft ContentBlock within which the edit should be performed. */
  blockKey: string;
  /** The character position within the block where the edit should start. */
  offset: number;
  /** The number of characters to remove, starting at `offset`. */
  deletionLength?: number;
  /** The description of the text to insert at `offset`. */
  insertion?: Insertion;
  /**
   * Defines an order of precedence that will be used to decide the order in which
   * edits are applied in the case that multiple edits have the same `offset`.
   * Edits with higher precedence get applied first. If edits have the same offset
   * and the same precedence, they are applied in the order they were added to the
   * transaction.
   */
  precedence?: number;
};
