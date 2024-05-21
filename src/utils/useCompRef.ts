export function useCompRef<T extends abstract new (...args: any) => any>(
  _comp: T,
) {
  return ref<InstanceType<T>>()
}
