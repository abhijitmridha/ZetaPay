import crypto from 'crypto';

export const FIELD_MODULUS = BigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617'
);

export const BATCH_SIZE = 128;

export type PayrollBatchCurrency = 'XLM' | 'USDC';

export type PayrollBatchEmployee = {
  id: number;
  walletAddress: string;
};

export type PayrollBatchInputItem = {
  personId: string;
  amount: string;
  currency: PayrollBatchCurrency;
};

export type PayrollBatchRow = {
  employee: PayrollBatchEmployee;
  item: PayrollBatchInputItem;
  index: number;
  amountMinor: string;
  recipientHash: string;
  payeeType: string;
  tokenType: string;
  salt: string;
  commitment: string;
  merklePath: string[];
  pathIndices: number[];
};

export type BuiltPayrollBatch = {
  batchSize: number;
  batchCount: number;
  batchRoot: string;
  payrollRunHash: string;
  proofHash: string;
  proofData: {
    mode: 'placeholder';
    protocol: 'groth16';
    batchRoot: string;
    payrollRunHash: string;
    note: string;
  };
  proofPublicInputs: {
    batchRoot: string;
    payrollRunHash: string;
    totalXlm: string;
    totalUsdc: string;
    payeeCount: number;
  };
  rows: PayrollBatchRow[];
  totals: {
    totalXlm: number;
    totalUsdc: number;
    totalGross: number;
  };
};

function randomHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function sha256Hex(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function hashToField(...values: string[]) {
  const hash = crypto.createHash('sha256').update(values.join(':')).digest('hex');
  return (BigInt(`0x${hash}`) % FIELD_MODULUS).toString();
}

function hashPair(left: string, right: string) {
  return hashToField(left, right);
}

export function tokenType(currency: PayrollBatchCurrency) {
  return currency === 'XLM' ? '1' : '2';
}

export function toMinorUnits(amount: string) {
  return Math.round(Number(amount) * 10_000_000).toString();
}

function buildMerkleBatch(leaves: string[]) {
  const padded = [...leaves];

  while (padded.length < BATCH_SIZE) {
    padded.push('0');
  }

  let level = padded;
  const levels = [level];

  while (level.length > 1) {
    const next: string[] = [];

    for (let index = 0; index < level.length; index += 2) {
      next.push(hashPair(level[index], level[index + 1]));
    }

    level = next;
    levels.push(level);
  }

  const paths = padded.map((_, leafIndex) => {
    const siblings: string[] = [];
    const pathIndices: number[] = [];
    let index = leafIndex;

    for (let depth = 0; depth < levels.length - 1; depth += 1) {
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;

      siblings.push(levels[depth][siblingIndex]);
      pathIndices.push(index % 2);

      index = Math.floor(index / 2);
    }

    return {
      siblings,
      pathIndices,
    };
  });

  return {
    root: level[0],
    paths,
  };
}

export function buildPayrollBatch({
  enterpriseId,
  periodStart,
  periodEnd,
  auditKey,
  items,
  employees,
}: {
  enterpriseId: number;
  periodStart: string;
  periodEnd: string;
  auditKey: string;
  items: PayrollBatchInputItem[];
  employees: PayrollBatchEmployee[];
}): BuiltPayrollBatch {
  if (items.length > BATCH_SIZE) {
    throw new Error(`This endpoint currently supports ${BATCH_SIZE} payees per proof`);
  }

  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));

  const totalXlm = items
    .filter((item) => item.currency === 'XLM')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalUsdc = items
    .filter((item) => item.currency === 'USDC')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalGross = totalXlm + totalUsdc;

  const payrollRunHash = hashToField(
    String(enterpriseId),
    periodStart,
    periodEnd,
    String(Date.now()),
    auditKey
  );

  const rowsWithoutPaths = items.map((item, index) => {
    const employee = employeeById.get(Number(item.personId));

    if (!employee) {
      throw new Error(`Employee ${item.personId} not found`);
    }

    const amountMinor = toMinorUnits(item.amount);
    const recipientHash = hashToField(employee.walletAddress);
    const rowPayeeType = String(index + 1);
    const rowTokenType = tokenType(item.currency);
    const salt = hashToField(randomHex(32), item.personId, item.amount, item.currency);

    const commitment = hashToField(
      String(employee.id),
      recipientHash,
      amountMinor,
      rowPayeeType,
      rowTokenType,
      payrollRunHash,
      salt
    );

    return {
      employee,
      item,
      index,
      amountMinor,
      recipientHash,
      payeeType: rowPayeeType,
      tokenType: rowTokenType,
      salt,
      commitment,
    };
  });

  const merkle = buildMerkleBatch(rowsWithoutPaths.map((row) => row.commitment));

  const rows = rowsWithoutPaths.map((row) => {
    const path = merkle.paths[row.index];

    return {
      ...row,
      merklePath: path.siblings,
      pathIndices: path.pathIndices,
    };
  });

  const proofHash = `0x${crypto
    .createHash('sha256')
    .update(JSON.stringify({ root: merkle.root, payrollRunHash }))
    .digest('hex')
    .slice(0, 62)}`;

  return {
    batchSize: BATCH_SIZE,
    batchCount: 1,
    batchRoot: merkle.root,
    payrollRunHash,
    proofHash,
    proofData: {
      mode: 'placeholder',
      protocol: 'groth16',
      batchRoot: merkle.root,
      payrollRunHash,
      note: 'Replace with snarkjs proof.json once server side proving is wired.',
    },
    proofPublicInputs: {
      batchRoot: merkle.root,
      payrollRunHash,
      totalXlm: totalXlm.toString(),
      totalUsdc: totalUsdc.toString(),
      payeeCount: rows.length,
    },
    rows,
    totals: {
      totalXlm,
      totalUsdc,
      totalGross,
    },
  };
}
