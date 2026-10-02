import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { isAddress } from "viem";

export const withdrawAssetItemSchema = yup.object().shape({
  asset: yup
    .string()
    .required("Collateral asset is required")
    .test("is-address", "Invalid collateral asset address", (value) =>
      value ? isAddress(value) : false,
    ),
  amount: yup
    .string()
    .required("Amount is required")
    .test(
      "is-positive-number",
      "Amount must be greater than zero",
      (value) => !isNaN(Number(value)) && Number(value) > 0,
    ),
});

export const withdrawCollateralSchema = yup.object().shape({
  positionId: yup.string().required("Position is required"),
  withdrawals: yup
    .array()
    .of(withdrawAssetItemSchema)
    .min(1, "At least one asset withdrawal must be configured")
    .required("At least one asset withdrawal must be configured"),
});

export type WithdrawCollateralSchemaType = yup.InferType<
  typeof withdrawCollateralSchema
>;
export const withdrawCollateralSchemaResolver = yupResolver(
  withdrawCollateralSchema,
);
