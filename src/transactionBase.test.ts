import { EditorState, ContentState } from 'draft-js';
import { Map, List } from 'immutable';
import { Edit } from './types';
import { addEdit, apply } from './transactionBase';

const createEditorState = (text?: string) => EditorState.createWithContent(ContentState.createFromText(text || ''));

describe('transactionBase', () => {
  describe('addEdit', () => {
    test('inserts edits by block', () => {
      let editMap: Map<string, List<Edit>> = Map();
      const edits: Edit[] = [
        { type: 'slice', blockKey: '1', offset: 0 },
        { type: 'slice', blockKey: '1', offset: 0 },
        { type: 'slice', blockKey: '2', offset: 0 }
      ];

      editMap = addEdit(editMap, edits[0]);
      editMap = addEdit(editMap, edits[1]);
      editMap = addEdit(editMap, edits[2]);
      expect(editMap).toEqual(Map({
        1: List.of(edits[0], edits[1]),
        2: List.of(edits[2])
      }));
    });

    test('inserts edits ordered by offset', () => {
      let editMap: Map<string, List<Edit>> = Map();
      const edits: Edit[] = [
        { type: 'slice', blockKey: '1', offset: 2 },
        { type: 'slice', blockKey: '1', offset: 0 },
        { type: 'slice', blockKey: '1', offset: 1 }
      ];

      editMap = addEdit(editMap, edits[0]);
      editMap = addEdit(editMap, edits[1]);
      editMap = addEdit(editMap, edits[2]);
      expect(editMap).toEqual(Map({
        1: List.of(edits[1], edits[2], edits[0])
      }));
    });

    test('inserts edits of equal offset ordered by precedence', () => {
      let editMap: Map<string, List<Edit>> = Map();
      const edits: Edit[] = [
        { type: 'slice', blockKey: '1', offset: 0, precedence: 2 },
        { type: 'slice', blockKey: '1', offset: 0, precedence: 0 },
        { type: 'slice', blockKey: '1', offset: 0, precedence: 1 }
      ];

      editMap = addEdit(editMap, edits[0]);
      editMap = addEdit(editMap, edits[1]);
      editMap = addEdit(editMap, edits[2]);
      expect(editMap).toEqual(Map({
        1: List.of(edits[0], edits[2], edits[1])
      }));
    });
  });

  describe('apply', () => {
    test('can insert characters at multiple positions in a block', () => {
      const editorState = createEditorState('one two');
      const blocks = editorState.getCurrentContent().getBlocksAsArray();
      let editMap: Map<string, List<Edit>> = Map();
      editMap = addEdit(editMap, {
        type: 'slice',
        blockKey: blocks[0].getKey(),
        offset: 0,
        insertion: { text: 'zero ' }
      });
      editMap = addEdit(editMap, {
        type: 'slice',
        blockKey: blocks[0].getKey(),
        offset: 4,
        insertion: { text: 'one-and-a-half ' }
      });

      expect(apply(editMap, editorState).getCurrentContent().getPlainText()).toBe('zero one one-and-a-half two');
    });

    test('can delete characters at multiple positions in a block', () => {
      const editorState = createEditorState('one two three');
      const blocks = editorState.getCurrentContent().getBlocksAsArray();
      let editMap: Map<string, List<Edit>> = Map();
      editMap = addEdit(editMap, {
        type: 'slice',
        blockKey: blocks[0].getKey(),
        offset: 0,
        deletionLength: 4
      });
      editMap = addEdit(editMap, {
        type: 'slice',
        blockKey: blocks[0].getKey(),
        offset: 7,
        deletionLength: 6
      });

      expect(apply(editMap, editorState).getCurrentContent().getPlainText()).toBe('two');
    });

    test('can delete and insert with a single edit', () => {
      const editorState = createEditorState('one two three');
      const blocks = editorState.getCurrentContent().getBlocksAsArray();
      let editMap: Map<string, List<Edit>> = Map();
      editMap = addEdit(editMap, {
        type: 'slice',
        blockKey: blocks[0].getKey(),
        offset: 4,
        deletionLength: 3,
        insertion: { text: 'dos' }
      });

      expect(apply(editMap, editorState).getCurrentContent().getPlainText()).toBe('one dos three');
    });

    test('overlapping deletions delete the union of the deletion range', () => {
      const editorState = createEditorState('a b c d e f');
      const blocks = editorState.getCurrentContent().getBlocksAsArray();
      let editMap: Map<string, List<Edit>> = Map();
      editMap = addEdit(editMap, {
        type: 'slice',
        blockKey: blocks[0].getKey(),
        offset: 0,
        deletionLength: 4,
      });
      editMap = addEdit(editMap, {
        type: 'slice',
        blockKey: blocks[0].getKey(),
        offset: 2,
        deletionLength: 4
      });

      expect(apply(editMap, editorState).getCurrentContent().getPlainText()).toBe('d e f');
    });
  });
});
