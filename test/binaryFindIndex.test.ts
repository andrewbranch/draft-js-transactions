import { List } from 'immutable';
import { binaryFindIndex } from '../src/utils/binaryFindIndex';

describe('utils > binaryFindIndex', () => {
  test('should work for a list with an even number of elements', () => {
    const list = List.of(2, 4, 6, 9);
    expect(binaryFindIndex(list, 8)).toBe(3);
  });

  test('should work for a list with an odd number of elements', () => {
    const list = List.of(2, 4, 6, 9, 11);
    expect(binaryFindIndex(list, 7)).toBe(3);
  });

  test('should work for a list with zero elements', () => {
    expect(binaryFindIndex(List(), 5)).toBe(0);
  });

  test('should be able to insert an element at the beginning of a list', () => {
    expect(binaryFindIndex(List.of(1, 2), 0)).toBe(0);
  });

  test('should be able to insert an element at the end of a list', () => {
    expect(binaryFindIndex(List.of(1, 2), 3)).toBe(2);
  });

  test('should work for a list with one element', () => {
    expect(binaryFindIndex(List.of(4), 5)).toBe(1);
  });

  test('inserts equal elements at the end', () => {
    const list = List.of(2, 2, 2, 2);
    expect(binaryFindIndex(list, 2)).toBe(4);
  });
});
