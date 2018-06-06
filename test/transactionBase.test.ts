import { EditorState, ContentState, SelectionState } from 'draft-js';
import { Map, List, OrderedSet } from 'immutable';
import { Edit } from '../src/types';
import { addEdit, apply } from '../src/transactionBase';

const createEditorState = (text?: string) => EditorState.createWithContent(ContentState.createFromText(text || ''));

describe('transactionBase', () => {
  describe('addEdit', () => {
    test('inserts edits by block', () => {
      let editMap: Map<string, List<Edit>> = Map();
      const edits: Edit[] = [
        { type: 'splice', blockKey: '1', offset: 0 },
        { type: 'splice', blockKey: '1', offset: 0 },
        { type: 'splice', blockKey: '2', offset: 0 }
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
        { type: 'splice', blockKey: '1', offset: 2 },
        { type: 'splice', blockKey: '1', offset: 0 },
        { type: 'splice', blockKey: '1', offset: 1 }
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
        { type: 'splice', blockKey: '1', offset: 0, precedence: 2 },
        { type: 'splice', blockKey: '1', offset: 0, precedence: 0 },
        { type: 'splice', blockKey: '1', offset: 0, precedence: 1 }
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
    describe('error handling', () => {
      test('unrecognized edit type throws', () => {
        expect(() => {
          apply(addEdit(Map(), { type: 'asdfjkl;' as any, blockKey: '1', offset: 0 }), createEditorState());
        }).toThrow(/unrecognized edit type/i);
      });

      test('unrecognized selection edge handling throws', () => {
        expect(() => {
          const editorState = createEditorState();
          apply(addEdit(Map(), {
            type: 'splice',
            blockKey: editorState.getCurrentContent().getFirstBlock().getKey(),
            offset: 0,
            insertion: { text: '', selectionEdgeHandling: 'asdfjk;' as any }
          }), editorState);
        }).toThrow(/unrecognized selection ?edge ?handling/i);
      });
    });

    describe('basic insertions and deletions', () => {
      test('can insert characters at multiple positions in a block', () => {
        const editorState = createEditorState('one two');
        const blocks = editorState.getCurrentContent().getBlocksAsArray();
        let editMap: Map<string, List<Edit>> = Map();
        editMap = addEdit(editMap, {
          type: 'splice',
          blockKey: blocks[0].getKey(),
          offset: 0,
          insertion: { text: 'zero ' }
        });
        editMap = addEdit(editMap, {
          type: 'splice',
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
          type: 'splice',
          blockKey: blocks[0].getKey(),
          offset: 0,
          deletionLength: 4
        });
        editMap = addEdit(editMap, {
          type: 'splice',
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
          type: 'splice',
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
          type: 'splice',
          blockKey: blocks[0].getKey(),
          offset: 0,
          deletionLength: 4,
        });
        editMap = addEdit(editMap, {
          type: 'splice',
          blockKey: blocks[0].getKey(),
          offset: 2,
          deletionLength: 4
        });

        expect(apply(editMap, editorState).getCurrentContent().getPlainText()).toBe('d e f');
      });

      test('can replace multiple ranges with longer insertions than deletions', () => {
        const editorState = createEditorState('one x three x five');
        const blocks = editorState.getCurrentContent().getBlocksAsArray();
        let editMap: Map<string, List<Edit>> = Map();
        editMap = addEdit(editMap, {
          type: 'splice',
          blockKey: blocks[0].getKey(),
          offset: 4,
          deletionLength: 1,
          insertion: { text: 'two' }
        });
        editMap = addEdit(editMap, {
          type: 'splice',
          blockKey: blocks[0].getKey(),
          offset: 12,
          deletionLength: 1,
          insertion: { text: 'four' }
        });

        expect(apply(editMap, editorState).getCurrentContent().getPlainText()).toBe('one two three four five');
      });

      test('can replace multiple ranges with shorter insertions than deletions', () => {
        const editorState = createEditorState('one two three four five');
        const blocks = editorState.getCurrentContent().getBlocksAsArray();
        let editMap: Map<string, List<Edit>> = Map();
        editMap = addEdit(editMap, {
          type: 'splice',
          blockKey: blocks[0].getKey(),
          offset: 4,
          deletionLength: 3,
          insertion: { text: 'x' }
        });
        editMap = addEdit(editMap, {
          type: 'splice',
          blockKey: blocks[0].getKey(),
          offset: 14,
          deletionLength: 4,
          insertion: { text: 'x' }
        });

        expect(apply(editMap, editorState).getCurrentContent().getPlainText()).toBe('one x three x five');
      });

      test('can insert text into a deleted range', () => {
        const editorState = createEditorState('one two three');
        const blocks = editorState.getCurrentContent().getBlocksAsArray();
        let editMap: Map<string, List<Edit>> = Map();
        editMap = addEdit(editMap, {
          type: 'splice',
          blockKey: blocks[0].getKey(),
          offset: 4,
          deletionLength: 3,
          insertion: { text: '' }
        });
        editMap = addEdit(editMap, {
          type: 'splice',
          blockKey: blocks[0].getKey(),
          offset: 4,
          deletionLength: 0,
          insertion: { text: 'x' }
        });

        expect(apply(editMap, editorState).getCurrentContent().getPlainText()).toBe('one x three');
      });

      test('can replace text in a deleted range', () => {
        const editorState = createEditorState('one two three');
        const blocks = editorState.getCurrentContent().getBlocksAsArray();
        let editMap: Map<string, List<Edit>> = Map();
        editMap = addEdit(editMap, {
          type: 'splice',
          blockKey: blocks[0].getKey(),
          offset: 4,
          deletionLength: 3,
          insertion: { text: '' }
        });
        editMap = addEdit(editMap, {
          type: 'splice',
          blockKey: blocks[0].getKey(),
          offset: 4,
          deletionLength: 2,
          insertion: { text: 'x' }
        });

        expect(apply(editMap, editorState).getCurrentContent().getPlainText()).toBe('one x three');
      });


      test('can replace text overlapping deleted range', () => {
        const editorState = createEditorState('one two three');
        const blocks = editorState.getCurrentContent().getBlocksAsArray();
        let editMap: Map<string, List<Edit>> = Map();
        editMap = addEdit(editMap, {
          type: 'splice',
          blockKey: blocks[0].getKey(),
          offset: 4,
          deletionLength: 3,
          insertion: { text: '' }
        });
        editMap = addEdit(editMap, {
          type: 'splice',
          blockKey: blocks[0].getKey(),
          offset: 4,
          deletionLength: 4,
          insertion: { text: 'x ' }
        });

        expect(apply(editMap, editorState).getCurrentContent().getPlainText()).toBe('one x three');
      });

      test('edits occur in the correct block', () => {
        const editorState = createEditorState('one two\nthree');
        const blocks = editorState.getCurrentContent().getBlocksAsArray();
        let editMap: Map<string, List<Edit>> = Map();
        editMap = addEdit(editMap, {
          type: 'splice',
          blockKey: blocks[1].getKey(),
          offset: 0,
          deletionLength: 5,
          insertion: { text: 'four' }
        });

        expect(apply(editMap, editorState).getCurrentContent().getPlainText()).toBe('one two\nfour');
      });
    });

    describe('styles and entities', () => {
      test('can insert text with inline styles', () => {
        const editorState = createEditorState();
        const blockKey = editorState.getCurrentContent().getFirstBlock().getKey();
        let editMap: Map<string, List<Edit>> = Map();
        editMap = addEdit(editMap, {
          type: 'splice',
          blockKey,
          offset: 0,
          insertion: {
            text: 'Bold',
            style: OrderedSet.of('BOLD')
          }
        });

        expect(apply(editMap, editorState).getCurrentContent().getFirstBlock().getCharacterList()).toMatchSnapshot();
      });

      test('can insert text with an entity key', () => {
        const editorState = createEditorState();
        const blockKey = editorState.getCurrentContent().getFirstBlock().getKey();
        let editMap: Map<string, List<Edit>> = Map();
        editMap = addEdit(editMap, {
          type: 'splice',
          blockKey,
          offset: 0,
          insertion: {
            text: 'Entity',
            entityKey: '1'
          }
        });

        expect(apply(editMap, editorState).getCurrentContent().getFirstBlock().getCharacterList()).toMatchSnapshot();
      });

      test('can insert text with a style callback', () => {
        let editorState = createEditorState();
        const blockKey = editorState.getCurrentContent().getFirstBlock().getKey();
        let setupEdits: Map<string, List<Edit>> = Map();
        setupEdits = addEdit(setupEdits, {
          type: 'splice',
          blockKey,
          offset: 0,
          insertion: {
            text: 'bold',
            style: OrderedSet.of('BOLD')
          }
        });
        setupEdits = addEdit(setupEdits, {
          type: 'splice',
          blockKey,
          offset: 4,
          insertion: {
            text: 'italic',
            style: OrderedSet.of('ITALIC')
          }
        });
        editorState = apply(setupEdits, editorState);

        let testEdits: Map<string, List<Edit>> = Map();
        testEdits = addEdit(testEdits, {
          type: 'splice',
          blockKey,
          offset: 4,
          insertion: {
            text: 'both',
            style: ({ before, after }) => {
              expect(before).toEqual(OrderedSet.of('BOLD'));
              expect(after).toEqual(OrderedSet.of('ITALIC'));
              return before!.union(after!);
            }
          }
        });

        expect(apply(testEdits, editorState).getCurrentContent().getFirstBlock().getCharacterList()).toMatchSnapshot();
      });
    });

    describe('selection behavior', () => {
      test('inserting text before a selection moves selection forward', () => {
        let editorState = createEditorState('one two');
        const blockKey = editorState.getCurrentContent().getFirstBlock().getKey();
        editorState = EditorState.forceSelection(editorState, editorState.getSelection().merge({
          anchorOffset: 4,
          focusOffset: 4
        }) as SelectionState);

        let editMap: Map<string, List<Edit>> = Map();
        editMap = addEdit(editMap, {
          type: 'splice',
          blockKey,
          offset: 0,
          insertion: { text: 'zero' }
        });

        expect(apply(editMap, editorState).getSelection().toJS()).toMatchObject({
          anchorKey: blockKey,
          anchorOffset: 8,
          focusKey: blockKey,
          focusOffset: 8,
          hasFocus: true,
          isBackward: false
        });
      });

      test('deleting text before a selection moves selection back', () => {
        let editorState = createEditorState('one two');
        const blockKey = editorState.getCurrentContent().getFirstBlock().getKey();
        editorState = EditorState.forceSelection(editorState, editorState.getSelection().merge({
          anchorOffset: 4,
          focusOffset: 4
        }) as SelectionState);

        let editMap: Map<string, List<Edit>> = Map();
        editMap = addEdit(editMap, {
          type: 'splice',
          blockKey,
          offset: 0,
          deletionLength: 4
        });

        expect(apply(editMap, editorState).getSelection().toJS()).toMatchObject({
          anchorKey: blockKey,
          anchorOffset: 0,
          focusKey: blockKey,
          focusOffset: 0,
          hasFocus: true,
          isBackward: false
        });
      });

      test('inserting text after a selection doesn’t move the selection', () => {
        let editorState = createEditorState('one two');
        const blockKey = editorState.getCurrentContent().getFirstBlock().getKey();

        let editMap: Map<string, List<Edit>> = Map();
        editMap = addEdit(editMap, {
          type: 'splice',
          blockKey,
          offset: 7,
          insertion: { text: ' three' }
        });

        expect(apply(editMap, editorState).getSelection().toJS()).toMatchObject({
          anchorKey: blockKey,
          anchorOffset: 0,
          focusKey: blockKey,
          focusOffset: 0,
          hasFocus: true,
          isBackward: false
        });
      });

      test('inserting text in another block doesn’t move the selection', () => {
        let editorState = createEditorState('one two\nthree');
        const blocks = editorState.getCurrentContent().getBlocksAsArray();
        editorState = EditorState.forceSelection(editorState, editorState.getSelection().merge({
          anchorOffset: 4,
          focusOffset: 4
        }) as SelectionState);

        let editMap: Map<string, List<Edit>> = Map();
        editMap = addEdit(editMap, {
          type: 'splice',
          blockKey: blocks[1].getKey(),
          offset: 0,
          insertion: { text: 'four ' }
        });

        expect(apply(editMap, editorState).getSelection().toJS()).toMatchObject({
          anchorKey: blocks[0].getKey(),
          anchorOffset: 4,
          focusKey: blocks[0].getKey(),
          focusOffset: 4,
          hasFocus: true,
          isBackward: false
        });
      });

      test('replacing text before a selection moves the selection by the net insertion length', () => {
        let editorState = createEditorState('one two');
        const blockKey = editorState.getCurrentContent().getFirstBlock().getKey();
        editorState = EditorState.forceSelection(editorState, editorState.getSelection().merge({
          anchorOffset: 4,
          focusOffset: 4
        }) as SelectionState);

        let editMap: Map<string, List<Edit>> = Map();
        editMap = addEdit(editMap, {
          type: 'splice',
          blockKey,
          offset: 0,
          deletionLength: 3,
          insertion: { text: 'four' }
        });

        expect(apply(editMap, editorState).getSelection().toJS()).toMatchObject({
          anchorKey: blockKey,
          anchorOffset: 5,
          focusKey: blockKey,
          focusOffset: 5,
          hasFocus: true,
          isBackward: false
        });
      });

      test('deleting text around a selection moves the selection to the beginning of the deleted range', () => {
        let editorState = createEditorState('one two');
        const blockKey = editorState.getCurrentContent().getFirstBlock().getKey();
        editorState = EditorState.forceSelection(editorState, editorState.getSelection().merge({
          anchorOffset: 2,
          focusOffset: 2
        }) as SelectionState);

        let editMap: Map<string, List<Edit>> = Map();
        editMap = addEdit(editMap, {
          type: 'splice',
          blockKey,
          offset: 1,
          deletionLength: 2
        });

        expect(apply(editMap, editorState).getSelection().toJS()).toMatchObject({
          anchorKey: blockKey,
          anchorOffset: 1,
          focusKey: blockKey,
          focusOffset: 1,
          hasFocus: true,
          isBackward: false
        });
      });
    });
  });
});
