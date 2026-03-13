import type { PerformanceType } from "@/types/keigennRecord2";
import { getActionNameLite } from "@/resources/logic/actionMetaResolver";
import { getIconSrcById } from "@/utils/xivapi";
import { chineseToIcon } from "./chineseToIcon";
import { compareSame } from "./compareSaveAction";

const DYNAMIC_EXPRESSION_PATTERN = /^[\s\w=>()*+\-/.,:;<?@[\]^{}!]+$/;

function evaluateDynamicExpression(value: string, level: number): unknown {
  if (!DYNAMIC_EXPRESSION_PATTERN.test(value)) throw new Error("函数表达式中的字符无效");

  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  const fn = new Function("level", `return (${value})(level)`) as (level: number) => unknown;
  return fn(level);
}

function parseDynamicValue(value: string | number, level: number): number {
  if (typeof value === "number") return value;

  const numericAttempt = Number(value);
  if (!Number.isNaN(numericAttempt)) return numericAttempt;

  try {
    const result = evaluateDynamicExpression(value, level);

    if (typeof result !== "number" || !Number.isFinite(result)) {
      throw new TypeError(`Function returned non-number: ${JSON.stringify(result)}`);
    }

    return result;
  } catch (e) {
    console.error(`解析动态值无法处理值 "${value}":`, e);
    throw e;
  }
}

function parseDynamicPerformance(value: PerformanceType | string, level: number): PerformanceType {
  if (typeof value !== "string") return value;

  try {
    const result = evaluateDynamicExpression(value, level);
    if (!result || typeof result !== "object")
      throw new TypeError(`Function returned non-performance value: ${JSON.stringify(result)}`);
    const perf = result as Record<string, unknown>;
    if (
      typeof perf.physics !== "number" ||
      !Number.isFinite(perf.physics) ||
      typeof perf.magic !== "number" ||
      !Number.isFinite(perf.magic) ||
      typeof perf.darkness !== "number" ||
      !Number.isFinite(perf.darkness)
    ) {
      throw new TypeError(`Function returned non-performance value: ${JSON.stringify(result)}`);
    }
    return {
      physics: perf.physics,
      magic: perf.magic,
      darkness: perf.darkness,
    };
  } catch (e) {
    console.error(`解析动态 performance 无法处理值 "${value}":`, e);
    throw e;
  }
}

function idToSrc(id: number | string) {
  if (typeof id === "string") {
    id = parseDynamicValue(id, 999);
  }

  const chinese = getActionNameLite(id) || getActionNameLite(compareSame(id));
  if (!chinese) {
    // console.warn(`找不到动作中文: ${id}`)
    return "";
  }
  const icon = chineseToIcon(chinese);
  if (!icon) {
    // console.warn(`找不到动作图标: ${chinese}, icon: ${icon}`)
    return "";
  }
  return getIconSrcById(icon);
}
export { idToSrc, parseDynamicPerformance, parseDynamicValue };
