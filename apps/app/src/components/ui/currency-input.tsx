"use client";

import * as React from "react";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { cn } from "@/lib/utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "./input-group";

interface CurrencyInputFieldProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  placeholder?: string;
  className?: string;
  maxDecimals?: number;
  disabled?: boolean;
  addon?: string | React.ReactNode;
  addonClassName?: string;
}

function truncateForMaxDecimals(clean: string, maxDecimals: number): string {
  if (!clean.includes(".")) return clean;
  const [intPart, decPart] = clean.split(".");
  return `${intPart}.${decPart.slice(0, maxDecimals)}`;
}

function anchorsBeforeCaret(str: string, caret: number): number {
  let count = 0;
  for (let i = 0; i < caret && i < str.length; i++) {
    if (/[\d.]/.test(str[i])) count++;
  }
  return count;
}

function caretAfterAnchors(str: string, anchorCount: number): number {
  if (anchorCount <= 0) return 0;
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (/[\d.]/.test(str[i])) {
      count++;
      if (count === anchorCount) return i + 1;
    }
  }
  return str.length;
}

function cleanNumericInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let str = String(value).trim();
  if (str === "") return "";

  str = str.replace(/,/g, "").replace(/[^\d.]/g, "");
  if (str === "") return "";

  const parts = str.split(".");
  if (parts.length > 2) str = `${parts[0]}.${parts.slice(1).join("")}`;

  const [intRaw, decRaw] = str.split(".");
  let intPart = intRaw.replace(/^0+(?=\d)/, "");

  // Always normalize an empty integer part to "0" when a decimal exists —
  // keeps the stored value schema/contract-safe ("0.5", never ".5").
  if (decRaw !== undefined && intPart === "") intPart = "0";
  else if (intPart === "") intPart = str.startsWith("0") ? "0" : "";

  return decRaw !== undefined ? `${intPart}.${decRaw}` : intPart;
}

function formatNumericInput(
  value: string | number | null | undefined,
  maxDecimals?: number,
): string {
  let clean = cleanNumericInput(value);
  if (clean === "") return "";

  if (maxDecimals !== undefined && clean.includes(".")) {
    const [i, d] = clean.split(".");
    clean = `${i}.${d.slice(0, maxDecimals)}`;
  }

  const hasTrailingDot = clean.endsWith(".");
  const [intPart, decPart] = clean.split(".");
  const formattedInt = (intPart || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (decPart !== undefined) return `${formattedInt}.${decPart}`;
  return hasTrailingDot ? `${formattedInt}.` : formattedInt;
}

export function CurrencyInputField<T extends FieldValues>({
  name,
  control,
  placeholder = "0.00",
  className,
  maxDecimals,
  disabled,
  addon,
  addonClassName,
}: CurrencyInputFieldProps<T>) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const displayValue = formatNumericInput(field.value);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const input = e.target;
          const rawInput = input.value;
          const caretPos = input.selectionStart ?? rawInput.length;

          let anchorsBefore = anchorsBeforeCaret(rawInput, caretPos);

          // Detect "user is typing with no integer part yet" (e.g. just typed ".")
          const strippedRaw = rawInput.replace(/,/g, "");
          const dotIdx = strippedRaw.indexOf(".");
          const integerPartEmpty =
            dotIdx !== -1 &&
            strippedRaw.slice(0, dotIdx).replace(/\D/g, "") === "";
          if (integerPartEmpty) anchorsBefore += 1; // account for the synthetic "0"

          let clean = cleanNumericInput(rawInput);
          if (maxDecimals !== undefined)
            clean = truncateForMaxDecimals(clean, maxDecimals);

          field.onChange(clean);

          const newFormatted = formatNumericInput(clean, maxDecimals);
          requestAnimationFrame(() => {
            if (!inputRef.current) return;
            const newCaret = caretAfterAnchors(newFormatted, anchorsBefore);
            inputRef.current.setSelectionRange(newCaret, newCaret);
          });
        };

        return (
          <div className="flex flex-col flex-1 items-start relative">
            <InputGroup
              className={cn(
                "has-[[data-slot=input-group-control]:focus-visible]:ring-0",
                className,
              )}
            >
              {addon && (
                <InputGroupAddon className="p-0">
                  {typeof addon == "string" ? (
                    <InputGroupText className={addonClassName}>
                      {addon}
                    </InputGroupText>
                  ) : (
                    addon
                  )}
                </InputGroupAddon>
              )}
              <InputGroupInput
                {...field}
                ref={(el) => {
                  inputRef.current = el;
                  if (typeof field.ref === "function") field.ref(el);
                }}
                value={displayValue}
                onChange={handleChange}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder={placeholder}
                disabled={disabled}
                className={className}
                onKeyDown={(e) => {
                  // Block a second decimal point and any non-numeric key
                  // that isn't a control/navigation key.
                  const allowedControlKeys = [
                    "Backspace",
                    "Delete",
                    "ArrowLeft",
                    "ArrowRight",
                    "Tab",
                    "Home",
                    "End",
                  ];
                  if (allowedControlKeys.includes(e.key)) return;
                  if (e.key === "." && field.value?.toString().includes(".")) {
                    e.preventDefault();
                    return;
                  }
                  if (!/^[0-9.]$/.test(e.key) && !e.metaKey && !e.ctrlKey) {
                    e.preventDefault();
                  }
                }}
              />
            </InputGroup>
            {/* <Input
              {...field}
              ref={(el) => {
                inputRef.current = el;
                if (typeof field.ref === "function") field.ref(el);
              }}
              value={displayValue}
              onChange={handleChange}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder={placeholder}
              disabled={disabled}
              className={className}
              onKeyDown={(e) => {
                // Block a second decimal point and any non-numeric key
                // that isn't a control/navigation key.
                const allowedControlKeys = [
                  "Backspace",
                  "Delete",
                  "ArrowLeft",
                  "ArrowRight",
                  "Tab",
                  "Home",
                  "End",
                ];
                if (allowedControlKeys.includes(e.key)) return;
                if (e.key === "." && field.value?.toString().includes(".")) {
                  e.preventDefault();
                  return;
                }
                if (!/^[0-9.]$/.test(e.key) && !e.metaKey && !e.ctrlKey) {
                  e.preventDefault();
                }
              }}
            /> */}
            {fieldState.error && (
              <span className="text-xs text-red-500 absolute -bottom-4">
                {fieldState.error.message}
              </span>
            )}
          </div>
        );
      }}
    />
  );
}
