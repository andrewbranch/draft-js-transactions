import { List } from 'immutable';
import { EditorState } from 'draft-js';
import { Transaction as ITransaction, Edit } from './types';
import { addEdit, removeEdit, apply } from './transactionBase';

export class Transaction implements ITransaction {
  private edits: List<Edit> = List();
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
