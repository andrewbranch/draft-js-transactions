export function assertUnreachable(t: never, error: Error): never {
  throw error;
}
