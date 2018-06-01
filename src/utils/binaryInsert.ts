import { Collection } from 'immutable';

export type ComparerFunction<T> = (a: T | undefined, b: T | undefined) => number;

function defaultValueComparer(a: any, b: any): number {
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
}

function _binaryInsert<T, U>(
  collection: Collection.Indexed<T>,
  insertion: T,
  insertionValue: U,
  lower: number,
  upper: number,
  valueExtractor: (item: T) => U,
  valueComparer: ComparerFunction<U>,
): Collection.Indexed<T> {
  if (upper - lower === 0) {
    const valueAtConvergence = valueExtractor(collection.get(upper));
    const compareResult = valueComparer(insertionValue, valueAtConvergence);
    return collection.splice(upper + Number(compareResult > 0), 0, insertion);
  }

  const index = Math.floor((upper + lower) / 2);
  const valueAtIndex = valueExtractor(collection.get(index));
  const compareResult = valueComparer(insertionValue, valueAtIndex);
  if (compareResult === 0) {
    return collection.splice(index, 0, insertion);
  }

  const [newLower, newUpper] = compareResult > 0 ? [index + 1, upper] : [lower, index];
  return _binaryInsert(
    collection,
    insertion,
    insertionValue,
    newLower,
    newUpper,
    valueExtractor,
    valueComparer
  );
}

export function binaryInsert<T, U = any>(
  collection: Collection.Indexed<T>,
  insertion: T,
  valueExtractor: (item: T) => U = (item: any) => item,
  valueComparer: (a: U | undefined, b: U | undefined) => number = defaultValueComparer
): Collection.Indexed<T> {
  return _binaryInsert(
    collection,
    insertion,
    valueExtractor(insertion),
    0,
    collection.size - 1,
    valueExtractor,
    valueComparer
  );
}
