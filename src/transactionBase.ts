import { EditorState, Modifier, SelectionState } from 'draft-js';
import { Collection, List, Map } from 'immutable';
import { Transaction, Edit, NeighboringCharacterAttributes, InsertionCallback, ChangeType } from './types';
import { binaryFindIndex, ComparerFunction } from './utils/binaryFindIndex';
import { identity } from './utils/identity';

const compareEdits: ComparerFunction<Edit> = (a, b) => {
  const offsetOrder = a.offset - b.offset;
  if (offsetOrder !== 0) return offsetOrder;
  return (b.precedence || 0) - (a.precedence || 0);
};

export function addEdit(edits: Map<string, List<Edit>>, edit: Edit): Map<string, List<Edit>> {
  const blockEdits = edits.get(edit.blockKey);
  if (blockEdits) {
    const index = binaryFindIndex(
      blockEdits,
      edit,
      identity,
      compareEdits
    );

    return edits.set(edit.blockKey, blockEdits.splice(index, 0, edit) as List<Edit>) as Map<string, List<Edit>>;
  }

  return edits.set(edit.blockKey, List.of(edit)) as Map<string, List<Edit>>;
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

export function apply(edits: Map<string, List<Edit>>, editorState: EditorState, changeType?: ChangeType): EditorState {
  const content = editorState.getCurrentContent();
  const selectionState = editorState.getSelection();
  const anchorOffset = selectionState.getAnchorOffset();
  const focusOffset = selectionState.getFocusOffset();
  const result = edits.reduce((updates, blockEdits) => {
    return blockEdits!.reduce((updates, edit) => {
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
          const prevCharIndex = position - 1;
          const nextCharIndex = position + (deletionLength || 0);
          const style = getAttributes(insertion ? insertion.style : undefined, {
            before: prevCharIndex < 0 ? undefined : block.getInlineStyleAt(prevCharIndex),
            after: nextCharIndex > blockLength - 1 ? undefined : block.getInlineStyleAt(nextCharIndex)
          });
          const entityKey = getAttributes(insertion ? insertion.entityKey : undefined, {
            before: prevCharIndex < 0 ? undefined : block.getEntityAt(prevCharIndex),
            after: nextCharIndex > blockLength - 1 ? undefined : block.getEntityAt(nextCharIndex)
          });
          const anchorOffset = Math.max(updates!.deletionEnd, offset);
          const focusOffset = Math.max(anchorOffset + (deletionLength || 0) - (anchorOffset - offset), anchorOffset);
          const selectionToReplace = SelectionState.createEmpty(blockKey).merge({
            anchorOffset: updates!.offset + anchorOffset,
            focusOffset: updates!.offset + focusOffset
          }) as SelectionState;

          return {
            content: Modifier.replaceText(updates!.content, selectionToReplace, text, style, entityKey),
            offset: updates!.offset + netInsertionLength,
            deletionEnd: updates!.offset + focusOffset,
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
    }, updates);
  }, {
    content,
    offset: 0,
    deletionEnd: 0,
    changeType: null as ChangeType | null
  });

  return EditorState.push(
    editorState,
    result.content,
    changeType || result.changeType || 'insert-characters'
  );
};
