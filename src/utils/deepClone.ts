export const deepClone = (() => {
  if (typeof structuredClone === 'function')
    return structuredClone

  return <T>(obj: T) => {
    if (obj === null || typeof obj !== 'object')
      return obj

    if (obj instanceof Date)
      return new Date(obj.getTime()) as T

    if (obj instanceof RegExp)
      return new RegExp(obj.source, obj.flags) as T

    if (Array.isArray(obj))
      return obj.map(item => deepClone(item)) as T

    if (Object.getPrototypeOf(obj) === Object.prototype) {
      const result: Record<string | number | symbol, unknown> = {}
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          result[key] = deepClone((obj as Record<string, unknown>)[key])
        }
      }
      return result as T
    }

    return obj as T
  }
})()
