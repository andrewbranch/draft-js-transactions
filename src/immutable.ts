import { List } from 'immutable';
import { Transaction, Edit } from './types';
import { addEdit, removeEdit, apply } from './transactionBase';

function _createTransaction(edits: List<Edit>): Transaction {
  return {
    addEdit: edit => _createTransaction(addEdit(edits, edit)),
    removeEdit: edit => _createTransaction(removeEdit(edits, edit)),
    apply: editorState => apply(edits, editorState)
  };
}

export function createTransaction(): Transaction {
  const edits: List<Edit> = List();
  return _createTransaction(edits);
}
