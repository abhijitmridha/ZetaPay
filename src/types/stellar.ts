export interface StellarBalance {
  balance: string;
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  limit?: string;
  buying_liabilities?: string;
  selling_liabilities?: string;
}
