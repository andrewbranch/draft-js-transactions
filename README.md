# draft-js-transactions [![Build Status](https://travis-ci.com/andrewbranch/draft-js-transactions.svg?branch=master)](https://travis-ci.com/andrewbranch/draft-js-transactions) [![codecov](https://codecov.io/gh/andrewbranch/draft-js-transactions/branch/master/graph/badge.svg)](https://codecov.io/gh/andrewbranch/draft-js-transactions)

**draft-js-transactions** is a lightweight, dependency-free library for making multiple edits at once to a [Draft](https://github.com/facebook/draft-js) EditorState.

## Installation

🚨 PLACEHOLDER, NOT PUBLISHED YET 🚨

```
npm install draft-js-transactions --save
```

or

```
yarn add draft-js-transactions
```

## Motivation

Why would you want to batch edits? Because edits within the same block are usually dependent upon each other. Imagine you had a ContentBlock with the text

> 1 alpaca, 2 billy goats, and 47 turtles

and with the caret at the end of the line, right after “turtles,” and you wanted to replace each numeral with its spelled-out form. Since ranges of text are described by indices in Draft, you might intuit an algorithm that would produce a series of replacements like

1. Replace the range (0, 1) with “One”
2. Replace the range (10, 11) with “two”
3. Replace the range (29, 31) with “forty-seven”

In code, you’d translate these steps to something like

```js
function replaceThoseNumerals(editorState, blockKey) {
  let nextContent = editorState.getCurrentContent();
  nextContent = Modifier.replaceText(nextContent, createSelection(blockKey, 0, 1), 'One');
  nextContent = Modifier.replaceText(nextContent, createSelection(blockKey, 10, 11), 'two');
  nextContent = Modifier.replaceText(nextContent, createSelection(blockKey, 29, 31), 'forty-seven');
  return EditorState.push(editorState, nextContent, 'replace-range');
}
```

You’d also probably expect the caret to remain at the end of the word “turtles.” However, if you run this, you’ll get

> One alpacatwo 2 billy goats, forty-sevend 47 turtles

and the caret will be at `forty-seve|nd` 😐. The problem is that each edit invalidates the pre-computed indices of its subsequent edits. The careful reader may observe that one could do better by simply applying the edits in reverse, but there still is some bookkeeping left to do to fix the selection. Using `draft-js-transactions` allows you to stage a series of edits whose offsets are relative to the original content. This is especially useful for separating logically separate edits: within the course of a single `onChange`, you could let three different plugins each add edits to the same transaction in order to keep them from colliding.

## Basic usage

To fix the above example by using `draft-js-transactions`:

```js
import { Transaction } from 'draft-js-transactions';

function replaceThoseNumerals(editorState, blockKey) {
  const transaction = new Transaction();
  transaction
    .addEdit({
      type: 'splice',
      blockKey,
      offset: 0,
      deletionLength: 1,
      insertion: { text: 'One' }
    })
    .addEdit({
      type: 'splice',
      blockKey,
      offset: 10,
      deletionLength: 1,
      insertion: { text: 'two' }
    })
    .addEdit({
      type: 'splice',
      blockKey,
      offset: 29,
      deletionLength: 2,
      insertion: { text: 'forty-seven' }
    });
  
  return transaction.apply(editorState);
}
```

## API

### Immutable API

There’s an equivalent immutable API as an alternative to the class-based API. The immutable API’s `addEdit` function returns a new Transaction containing the new edits, whereas the class-based API’s `addEdit` method returns `this` after updating its edits internally.

```js
import { Transaction } from 'draft-js-transactions';
import { createTransaction } from 'draft-js-transactions/immutable';

const mutableTransaction = new Transaction();
const immutableTransactionEmpty = createTransaction();

mutableTransaction.addEdit(edit);
mutableTransaction.size; // 1

const immutableTransactionWithEdit = immutableTransactionEmpty.addEdit(edit);
immutableTransactionEmpty.size;    // 0
immutableTransactionWithEdit.size; // 1
```

### Edits

#### `SpliceEdit`
- **`type: 'splice'`** The type of the edit. (It’s called `splice` because it works similarly to `Array.prototype.splice`.)
- **`blockKey: string`** The key of the Draft ContentBlock within which the edit should be performed.
- **`offset: number`** The character position within the block where the edit should start.
- **`precedence?: number`** Defines an order of precedence that will be used to decide the order in which edits are applied in the case that multiple edits have the same `offset`. Edits with higher precedence get applied first. If edits have the same offset and the same precedence, they are applied in the order they were added to the transaction.
- **`deletionLength?: number`** The number of characters to remove, starting at `offset`.
- **`insertion?: Insertion`** The description of the text to insert at `offset`.
  - **`text: string`** The characters to insert.
  - **`style?: OrderedSet<string> | InsertionCallback<OrderedSet<string>>`** The inline styles to apply to the inserted text.
  - **`entityKey?: string | InsertionCallback<string>`** The key of the Draft Entity to apply to the inserted text.
  - **`selectionEdgeHandling?: SelectionEdgeHandling`** Defines where the insertion should occur relative to a selection edge in the case that the insertion takes place at the same offset as an edge of the selection.
    - **`SelectionEdgeHandling.InsertBefore`** Inserts the text before the selection edge.
    - **`SelectionEdgeHanding.InsertAfter`** Inserts the text after the selection edge.
    - **`SelectionEdgeHanding.InsertInside`** Inserts the text inside a non-collapsed selection; that is, after a leading selection edge and before a trailing selection edge. Falls back to `InsertBefore` if the selection is not collapsed.
    - **`SelectionEdgeHandling.InsertOutside`** Inserts the text outside a non-collapsed selection; that is, before a leading selection edge and after a trailing selection edge. Falls back to `InsertBefore` if the selection is not collapsed.

#### `InsertionCallback<T>`
For an insertion’s `style` and `entityKey` properties, you may pass a function which receives the style or entity key, respectively, of the two characters immediately before and after the insertion position. For example, given the ContentBlock

> **Bold**_Italic_

and a SpliceEdit with `offset: 4`, you might want to style the inserted text with all the styles adjacent to it:

```js
{
  type: 'splice',
  offset: 4,
  blockKey,
  insertion: {
    text: 'Hello',
    style: ({ before, after }) => {
      before; // OrderedSet ['BOLD']
      after;  // OrderedSet ['ITALIC']
      return before.union(after) // OrderedSet ['BOLD', 'ITALIC']
    }
  }
}
```

If the offset is `0` or after the last character in a block, `before` or `after`, respectively, will be undefined. You should check that they exist before using them.

## Contributing

1. [Open an issue](https://github.com/andrewbranch/draft-js-transactions/issues/new) describing what you’d like to do
2. Fork this repo
3. If you’re adding a feature, make sure new code is covered by tests. If you’re fixing a bug, demonstrate the failure by writing a new failing test first.
4. If you’ve added to or changed the API, update this README.
5. Test your changes with `npm test`.
6. Submit a PR referencing the issue you created in step 1. CI will ensure that tests pass and coverage hasn’t decreased.