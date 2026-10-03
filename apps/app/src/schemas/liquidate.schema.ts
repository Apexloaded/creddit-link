import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

export const liquidateSchema = yup
  .object({
    positionId: yup.string().required("Position ID is required"),
    collateralAsset: yup.string().required("Collateral asset is required"),
    debtToCover: yup
      .string()
      .required("Amount is required")
      .test("is-valid-number", "Enter a valid positive amount", (value) => {
        if (!value) return false;
        const parsed = parseFloat(value);
        return !isNaN(parsed) && parsed > 0;
      })
      .test(
        "within-max-debt",
        "Amount exceeds max coverable debt or wallet balance",
        function (value) {
          if (!value) return true;
          const parsed = parseFloat(value);
          if (isNaN(parsed)) return true;

          const maxCoverable = this.options.context?.maxCoverable;
          if (maxCoverable === undefined || maxCoverable === null) return true;

          const max = parseFloat(String(maxCoverable));
          if (isNaN(max)) return true;

          return parsed <= max;
        },
      ),
  })
  .required();

export type LiquidateSchemaType = yup.InferType<typeof liquidateSchema>;
export const liquidateSchemaResolver = yupResolver(liquidateSchema);
