import { EditorState, Modifier, SelectionState } from 'draft-js';
import { Collection, List, Map } from 'immutable';
import { Transaction, Edit, NeighboringCharacterAttributes, InsertionCallback, ChangeType, SpliceEdit, SelectionEdgeHandling } from './types';
import { binaryFindIndex, ComparerFunction } from './utils/binaryFindIndex';
import { identity } from './utils/identity';
import { assertUnreachable } from './utils/assertUnreachable';

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

function getSelectionAdjustment(selection: { blockKey: string, offset: number }, edit: SpliceEdit, edge?: 'start' | 'end'): number {
  if (selection.blockKey !== edit.blockKey || edit.offset > selection.offset) return 0;
  const { insertion, deletionLength = 0 } = edit;
  const insertionLength = insertion ? insertion.text.length : 0;
  if (edit.offset < selection.offset) {
    return insertionLength - Math.min(deletionLength, selection.offset - edit.offset);
  }

  if (insertion) {
    const { selectionEdgeHandling = SelectionEdgeHandling.InsertBefore } = insertion;
    switch (selectionEdgeHandling) {
      case SelectionEdgeHandling.InsertBefore: return insertionLength;
      case SelectionEdgeHandling.InsertAfter: return 0;
      case SelectionEdgeHandling.InsertInside:
        return edge !== 'start' ? insertionLength : 0;
      case SelectionEdgeHandling.InsertOutside:
        return edge !== 'end' ? insertionLength : 0;
      default:
        assertUnreachable(selectionEdgeHandling, new Error(`Unrecognized selectionEdgeHandling: ${selectionEdgeHandling}`));
    }
  }

  return insertionLength;
}

export function apply(edits: Map<string, List<Edit>>, editorState: EditorState, changeType?: ChangeType): EditorState {
  const content = editorState.getCurrentContent();
  const selectionState = editorState.getSelection();
  const anchor = { blockKey: selectionState.getAnchorKey(), offset: selectionState.getAnchorOffset() };
  const focus = { blockKey: selectionState.getFocusKey(), offset: selectionState.getFocusOffset() };
  const isBackward = selectionState.getIsBackward();
  const isCollapsed = selectionState.isCollapsed();
  const result = edits.reduce((updates, blockEdits) => {
    return blockEdits!.reduce((updates, edit) => {
      const { type, insertion, deletionLength = 0, offset, blockKey } = edit!;
      switch (type) {
        case 'splice':
          const shouldMoveAnchor = selectionState.getAnchorKey() === blockKey;
          const shouldMoveFocus = selectionState.getFocusKey() === blockKey;
          const text = insertion ? insertion.text : '';
          const netInsertionLength = text.length - deletionLength;
          const position = offset + updates!.offset;
          const block = content.getBlockForKey(blockKey);
          const blockLength = block.getLength();
          const prevCharIndex = position - 1;
          const nextCharIndex = position + deletionLength;
          const style = getAttributes(insertion ? insertion.style : undefined, {
            before: prevCharIndex < 0 ? undefined : block.getInlineStyleAt(prevCharIndex),
            after: nextCharIndex > blockLength - 1 ? undefined : block.getInlineStyleAt(nextCharIndex)
          });
          const entityKey = getAttributes(insertion ? insertion.entityKey : undefined, {
            before: prevCharIndex < 0 ? undefined : block.getEntityAt(prevCharIndex),
            after: nextCharIndex > blockLength - 1 ? undefined : block.getEntityAt(nextCharIndex)
          });
          const anchorOffset = Math.max(updates!.deletionEnd, offset);
          const focusOffset = Math.max(anchorOffset + deletionLength - (anchorOffset - offset), anchorOffset);
          const selectionToReplace = SelectionState.createEmpty(blockKey).merge({
            anchorOffset: updates!.offset + anchorOffset,
            focusOffset: updates!.offset + focusOffset
          }) as SelectionState;

          return {
            content: Modifier.replaceText(updates!.content, selectionToReplace, text, style, entityKey),
            offset: updates!.offset + netInsertionLength,
            deletionEnd: updates!.offset + focusOffset,
            shiftAnchor: updates!.shiftAnchor + (shouldMoveAnchor
              ? getSelectionAdjustment(anchor, edit!, isCollapsed ? undefined : isBackward ? 'end' : 'start')
              : 0),
            shiftFocus: updates!.shiftFocus + (shouldMoveFocus
              ? getSelectionAdjustment(focus, edit!, isCollapsed ? undefined : isBackward ? 'start' : 'end')
              : 0),
            changeType: deletionLength ?
              'remove-range' : insertion ?
              updates!.changeType || 'insert-characters' :
              updates!.changeType
          };
        default: return assertUnreachable(type, new Error(`Unrecognized edit type: ${type}`));
      }
    }, updates);
  }, {
    content,
    offset: 0,
    deletionEnd: 0,
    shiftAnchor: 0,
    shiftFocus: 0,
    changeType: null as ChangeType | null
  });

  return EditorState.forceSelection(
    EditorState.push(
      editorState,
      result.content,
      changeType || result.changeType || 'insert-characters'
    ),
    selectionState.merge({
      anchorOffset: selectionState.getAnchorOffset() + result.shiftAnchor,
      focusOffset: selectionState.getFocusOffset() + result.shiftFocus
    }) as SelectionState
  );
};
