import { List, Map } from 'immutable';
import { Transaction, Edit } from './types';
import { addEdit, removeEdit, apply } from './transactionBase';

function _createTransaction(edits: Map<string, List<Edit>>): Transaction {
  return {
    addEdit: edit => _createTransaction(addEdit(edits, edit)),
    removeEdit: edit => _createTransaction(removeEdit(edits, edit)),
    apply: editorState => apply(edits, editorState)
  };
}

export function createTransaction(): Transaction {
  const edits: Map<string, List<Edit>> = Map();
  return _createTransaction(edits);
}
