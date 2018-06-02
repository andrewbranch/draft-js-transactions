import { Collection } from 'immutable';

export type ComparerFunction<T> = (a: T, b: T) => number;

function defaultValueComparer(a: any, b: any): number {
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
}

function _binaryFindIndex<T, U>(
  collection: Collection.Indexed<T>,
  insertion: T,
  insertionValue: U,
  lower: number,
  upper: number,
  valueExtractor: (item: T) => U,
  valueComparer: ComparerFunction<U>,
): number {
  if (upper - lower === 0) {
    const valueAtConvergence = valueExtractor(collection.get(upper));
    const compareResult = valueComparer(insertionValue, valueAtConvergence);
    return upper + Number(compareResult > 0);
  }

  const index = Math.floor((upper + lower) / 2);
  const valueAtIndex = valueExtractor(collection.get(index));
  const compareResult = valueComparer(insertionValue, valueAtIndex);
  if (compareResult === 0) {
    return index;
  }

  const [newLower, newUpper] = compareResult > 0 ? [index + 1, upper] : [lower, index];
  return _binaryFindIndex(
    collection,
    insertion,
    insertionValue,
    newLower,
    newUpper,
    valueExtractor,
    valueComparer
  );
}

export function binaryFindIndex<T, U = any>(
  collection: Collection.Indexed<T>,
  insertion: T,
  valueExtractor: (item: T) => U = (item: any) => item,
  valueComparer: ComparerFunction<U> = defaultValueComparer
): number {
  return _binaryFindIndex(
    collection,
    insertion,
    valueExtractor(insertion),
    0,
    Math.max(0, collection.size - 1),
    valueExtractor,
    valueComparer
  );
}
