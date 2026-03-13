import type { DynamicValue } from "@/types/dynamicValue";
import { parseDynamicValue } from "@/utils/dynamicValue";

const SAMPLE_LEVELS = [1, 50, 90, 100] as const;

// 校验 DynamicValue 在多个等级下是否可稳定解析，返回空字符串表示合法。
export function validateDynamicValue(value: DynamicValue): string {
  for (const lv of SAMPLE_LEVELS) {
    try {
      if (!Number.isFinite(parseDynamicValue(value, lv))) return `在 ${lv} 级返回了无效数值`;
    } catch (e: any) {
      return `在 ${lv} 级解析失败: ${e?.message || String(e)}`;
    }
  }
  return "";
}

// 带 label 前缀的版本（供 TeamWatch 兼容使用）。
export function validateDynamicValueWithLabel(value: DynamicValue, label: string): string {
  const err = validateDynamicValue(value);
  return err ? `${label} ${err}` : "";
}

export function parseOptionalDynamicInput(input: string): DynamicValue | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) return numeric;
  return trimmed;
}

export function parseRequiredDynamicInput(input: string): DynamicValue | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) return numeric;
  return trimmed;
}

export function validateOptionalDynamicInput(input: string, label: string) {
  const parsed = parseOptionalDynamicInput(input);
  if (parsed === undefined) return "";
  return validateDynamicValueWithLabel(parsed, label);
}

export function validateRequiredDynamicInput(input: string, label: string) {
  const parsed = parseRequiredDynamicInput(input);
  if (parsed === null) {
    return {
      parsed: null,
      message: `${label}不能为空`,
    };
  }
  return {
    parsed,
    message: validateDynamicValueWithLabel(parsed, label),
  };
}
