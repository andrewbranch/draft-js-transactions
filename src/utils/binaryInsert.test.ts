import { List } from 'immutable';
import { binaryInsert } from './binaryInsert';

describe('utils > binaryInsert', () => {
  test('should work for a list with an even number of elements', () => {
    const list = List.of(2, 4, 6, 9);
    expect(binaryInsert(list, 8)).toEqual(List.of(2, 4, 6, 8, 9));
  });

  test('should work for a list with an odd number of elements', () => {
    const list = List.of(2, 4, 6, 9, 11);
    expect(binaryInsert(list, 7)).toEqual(List.of(2, 4, 6, 7, 9, 11));
  });

  test('should work for a list with zero elements', () => {
    expect(binaryInsert(List(), 5)).toEqual(List.of(5));
  });

  test('should be able to insert an element at the beginning of a list', () => {
    expect(binaryInsert(List.of(1, 2), 0)).toEqual(List.of(0, 1, 2));
  });

  test('should be able to insert an element at the end of a list', () => {
    expect(binaryInsert(List.of(1, 2), 3)).toEqual(List.of(1, 2, 3));
  });

  test('should work for a list with one element', () => {
    expect(binaryInsert(List.of(4), 5)).toEqual(List.of(4, 5));
  });


  test('should work for a list with equal elements', () => {
    const list = List.of(2, 2, 2, 2);
    expect(binaryInsert(list, 2)).toEqual(List.of(2, 2, 2, 2, 2));
  });
});
