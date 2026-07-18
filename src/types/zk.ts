export interface EmployeeProofInput {
  employee_ids: string[];
  salaries: number[];
  salts: string[];
  commitments: string[];
  merkle_roots: string[];
  merkle_proofs: string[][];
  merkle_path_indices: number[] | number[][];
  merkle_depths: number[];
  total_amount: number;
  employee_count: number;
  public_inputs: string[];
}

export interface ProofResult {
  proof: Uint8Array;
  publicInputs: string[];
}

export interface MerkleTreeResult {
  root: string;
  proofs: string[][];
  path_indices: number[][];
  depths: number[];
}
