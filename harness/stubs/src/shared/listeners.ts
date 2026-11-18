// Minimal deterministic listener boundary for the scoped publication tests.
export function registerListener<T>(listeners: Set<(event: T) => void>, listener: (event: T) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function notifyListeners<T>(listeners: Set<(event: T) => void>, event: T, onError: (error: unknown) => void): void {
  for (const listener of [...listeners]) {
    try { listener(event); } catch (error) { onError(error); }
  }
}
