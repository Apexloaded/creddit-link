export interface RawCreditLimitSafe {
  limit: string;
  userDebt: string;
  availableCredit: string;
  isStale: boolean;
  isValid: boolean;
}
