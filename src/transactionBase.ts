import { Collection, List } from 'immutable';
import { Transaction, Edit } from './types';
import { EditorState } from 'draft-js';
import { binaryFindIndex, ComparerFunction } from './utils/binaryFindIndex';
import { identity } from './utils/identity';

const compareEdits: ComparerFunction<Edit> = (a, b) => {
  if (!a) return 1;
  if (!b) return -1;
  const offsetOrder = a.offset - b.offset;
  if (offsetOrder !== 0) return offsetOrder;
  return (a.precedence || 0) - (b.precedence || 0);
};

export function addEdit<T extends Collection.Indexed<Edit>>(edits: T, edit: Edit): T {
  const index = binaryFindIndex(
    edits,
    edit,
    identity,
    compareEdits
  );

  return edits.splice(index, 0, edit) as T;
};

export function removeEdit<T extends Collection.Indexed<Edit>>(edits: T, edit: Edit): T {
  const index = binaryFindIndex(
    edits,
    edit,
    identity,
    compareEdits
  );

  if (edit === edits.get(index)) {
    return edits.splice(index, 1) as T;
  }

  return edits;
};

export function apply(edits: Collection.Indexed<Edit>, editorState: EditorState): EditorState {

};
