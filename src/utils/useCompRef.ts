/* eslint-disable @typescript-eslint/no-explicit-any */
// biome-ignore lint/suspicious/noExplicitAny:
export function useCompRef<T extends abstract new (...args: any) => any>(
  _comp: T,
) {
  return ref<InstanceType<T>>();
}
