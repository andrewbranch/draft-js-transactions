import { List, Map } from 'immutable';
import { EditorState } from 'draft-js';
import { Transaction as ITransaction, Edit } from './types';
import { addEdit, removeEdit, apply } from './transactionBase';

export class Transaction implements ITransaction {
  private edits: Map<string, List<Edit>> = Map();
  public addEdit(edit: Edit) {
    this.edits = addEdit(this.edits, edit);
    return this;
  }

  public removeEdit(edit: Edit) {
    this.edits = removeEdit(this.edits, edit);
    return this;
  }
  
  public apply(editorState: EditorState) {
    return apply(this.edits, editorState);
  }
}
