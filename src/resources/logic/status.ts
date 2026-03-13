import STATUS from "@/resources/generated/status.json";

const _STATUS = STATUS as unknown as Record<string, [string, number, number]>;

for (const key in STATUS) {
  const element = STATUS[key as keyof typeof STATUS];
  _STATUS[key] = [element[0]!, Number.parseInt(element[1]!), Number.parseInt(element[2]!)];
}

export function completeIcon(icon: number): string {
  let head = Array.from({ length: 6 }, () => "0");
  const iconStr = icon.toString();
  if (iconStr.length > 3) {
    const temp = [...Array.from(iconStr).slice(0, iconStr.length - 3), ...Array.from("000")];
    head = [...head.slice(0, 6 - temp.length), ...temp];
  }
  let foot = Array.from({ length: 6 }, () => "0");
  foot = [...foot.slice(0, 6 - iconStr.length), ...Array.from(iconStr)];
  return `${head.join("")}/${foot.join("")}`;
}

export function stackUrl(url: string, stack: number) {
  return stack > 1 && stack <= 16
    ? url.substring(0, 7) +
        (
          Array.from({ length: 6 }).join("0") +
          (Number.parseInt(url.substring(7)) + stack - 1)
        ).slice(-6)
    : url;
}
// A: =B5&": ["""&C5&""", "&E5&"],"
export const statusData: Record<number, [string, number, number]> = _STATUS;
