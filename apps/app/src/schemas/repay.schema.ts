import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

export const repaySchema = yup
  .object({
    isFullRepay: yup.boolean().required(),
    positionId: yup.string().required(),
    amount: yup
      .string()
      .required("Amount is required")
      .test("is-valid-number", "Enter a valid positive amount", (value) => {
        if (!value) return false;
        const parsed = parseFloat(value);
        return !isNaN(parsed) && parsed > 0;
      })
      .test(
        "within-balance",
        "Amount exceeds available balance",
        function (value) {
          if (!value) return true; // let "required"/"is-valid-number" own that case

          const parsed = parseFloat(value);
          if (isNaN(parsed)) return true; // let "is-valid-number" own that case

          // context is injected per-render from useForm's `context` option
          const maxBalance = this.options.context?.maxBalance;
          if (maxBalance === undefined || maxBalance === null) return true;

          const balance = parseFloat(String(maxBalance));
          if (isNaN(balance)) return true;

          return parsed <= balance;
        },
      ),
  })
  .required();

export type RepaySchemaType = yup.InferType<typeof repaySchema>;
export const repaySchemaResolver = yupResolver(repaySchema);
