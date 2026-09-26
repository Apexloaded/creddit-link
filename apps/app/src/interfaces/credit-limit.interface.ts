import { RawCreditLimitSafe } from "@/contracts/interfaces/risk-engine";
import { CollateralPosition } from "@/hooks/contracts/use-collateral";

export interface ICreditLimit extends RawCreditLimitSafe {}
export interface IPosition extends CollateralPosition {}
