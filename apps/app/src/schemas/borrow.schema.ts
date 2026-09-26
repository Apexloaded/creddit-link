import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup"

const borrowSchema = yup
  .object({
    amount: yup.string().required(),
  })
  .required();

export type BorrowSchemaType = yup.InferType<typeof borrowSchema>;
export const borrowSchemaResolver = yupResolver(borrowSchema);