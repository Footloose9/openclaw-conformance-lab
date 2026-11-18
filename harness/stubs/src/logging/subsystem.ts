// Synthetic logger boundary only; not an OpenClaw production dependency.
export function createSubsystemLogger(_name: string): { warn: (message: string) => void } {
  return { warn: () => {} };
}
