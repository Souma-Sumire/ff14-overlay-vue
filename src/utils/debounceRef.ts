type DebouncedRef<T> = {
  value: T;
};

export function debounceRef<T>(value: T, duration = 1000): DebouncedRef<T> {
  return customRef((track, trigger) => {
    let timeout: NodeJS.Timeout | null = null;

    return {
      get() {
        track();
        return value;
      },
      set(newValue: T) {
        value = newValue;
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          trigger();
        }, duration);
      },
    };
  });
}
