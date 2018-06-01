import { EditorState, Modifier, SelectionState } from 'draft-js';
import { Collection, List } from 'immutable';
import { Transaction, Edit, NeighboringCharacterAttributes, InsertionCallback, ChangeType } from './types';
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

const isInsertionCallback = <T>(fn: any): fn is InsertionCallback<T> => {
  return typeof fn === 'function';
};

function getAttributes<T extends string | object>(
  attr: T | InsertionCallback<T> | undefined,
  neighboringCharacters: NeighboringCharacterAttributes<T>
): T | undefined {
  if (isInsertionCallback<T>(attr)) {
    return attr(neighboringCharacters);
  }

  return attr;
}

export function apply(edits: Collection.Indexed<Edit>, editorState: EditorState, changeType?: ChangeType): EditorState {
  const content = editorState.getCurrentContent();
  const selectionState = editorState.getSelection();
  const anchorOffset = selectionState.getAnchorOffset();
  const focusOffset = selectionState.getFocusOffset();
  const result = edits.reduce((updates, edit) => {
    const { type, insertion, deletionLength, offset, blockKey } = edit!;
    const shouldMoveAnchor = selectionState.getAnchorKey() === blockKey;
    const shouldMoveFocus = selectionState.getFocusKey() === blockKey;
    switch (type) {
      case 'slice':
        const text = insertion ? insertion.text : '';
        const netInsertionLength = text.length - (deletionLength || 0);
        const position = updates!.offset;
        const block = content.getBlockForKey(blockKey);
        const blockLength = block.getLength();
        const prevCharIndex = position - 1
        const nextCharIndex = position + (deletionLength || 0);
        const style = getAttributes(insertion ? insertion.style : undefined, {
          before: prevCharIndex < 0 ? undefined : block.getInlineStyleAt(prevCharIndex),
          after: nextCharIndex > blockLength - 1 ? undefined : block.getInlineStyleAt(nextCharIndex)
        });
        const entityKey = getAttributes(insertion ? insertion.entityKey : undefined, {
          before: prevCharIndex < 0 ? undefined : block.getEntityAt(prevCharIndex),
          after: nextCharIndex > blockLength - 1 ? undefined : block.getEntityAt(nextCharIndex)
        });
        const selectionToReplace = SelectionState.createEmpty(blockKey).merge({
          anchorOffset: offset,
          focusOffset: offset + (deletionLength || 0)
        }) as SelectionState;

        return {
          content: Modifier.replaceText(updates!.content, selectionToReplace, text, style, entityKey),
          offset: updates!.offset + netInsertionLength,
          changeType: insertion
            ? 'insert-characters' : deletionLength
            ? updates!.changeType || 'remove-range'
            : null
        };
      default:
        ((t: never) => {
          throw new Error(`Unrecognized edit type: ${type}`);
        })(type);
    }
  }, { content, offset: 0, changeType: null as ChangeType | null });

  return EditorState.push(
    editorState,
    result.content,
    changeType || result.changeType || 'insert-characters'
  );
};
