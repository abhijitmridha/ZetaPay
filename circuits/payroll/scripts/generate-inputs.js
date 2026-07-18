import fs from 'fs';
import path from 'path';
import { poseidonHash, buildMerkleTree } from './merkle.js';

const BATCH_SIZE = 128;

const inputPath = path.join(process.cwd(), 'circuits/payroll/inputs/xlm.json');
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

function padArray(values, padValue = 0) {
  if (values.length > BATCH_SIZE) {
    throw new Error(`Batch has ${values.length} payees, but max is ${BATCH_SIZE}`);
  }

  return [...values, ...Array.from({ length: BATCH_SIZE - values.length }, () => padValue)];
}

data.payee_ids = padArray(data.payee_ids);
data.recipient_hashes = padArray(data.recipient_hashes);
data.amounts = padArray(data.amounts);
data.salts = padArray(data.salts);
data.payee_types = padArray(data.payee_types);
data.token_types = padArray(data.token_types);

const commitments = [];

for (let i = 0; i < BATCH_SIZE; i++) {
  if (Number(data.amounts[i]) === 0) {
    commitments.push('0');
    continue;
  }

  const commitment = await poseidonHash([
    BigInt(data.payee_ids[i]),
    BigInt(data.recipient_hashes[i]),
    BigInt(data.amounts[i]),
    BigInt(data.payee_types[i]),
    BigInt(data.token_types[i]),
    BigInt(data.period_id),
    BigInt(data.salts[i]),
  ]);

  commitments.push(commitment.toString());
}

const tree = await buildMerkleTree(commitments);

data.commitments = commitments;
data.batch_root_public = tree.root.toString();

fs.writeFileSync(inputPath, JSON.stringify(data, null, 2));

console.log('');
console.log('Generated commitments:', commitments.length);
console.log('Active payees:', data.payee_count_total);
console.log('Batch size:', BATCH_SIZE);
console.log('Batch root:', data.batch_root_public);
console.log('Input file:', inputPath);
console.log('');
