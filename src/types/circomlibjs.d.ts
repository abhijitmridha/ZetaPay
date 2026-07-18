declare module 'circomlibjs' {
  export interface Poseidon {
    (inputs: bigint[]): bigint;
    F: {
      toString(value: bigint): string;
    };
  }

  export function buildPoseidon(): Promise<Poseidon>;
}
