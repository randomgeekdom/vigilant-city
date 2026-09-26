const nativeRandom: () => number = Math.random;
let delegate: () => number = nativeRandom;

Math.random = () => delegate();

export function startSeeded(fn: () => number): void {
  delegate = fn;
}

export function stopSeeded(): void {
  delegate = nativeRandom;
}
