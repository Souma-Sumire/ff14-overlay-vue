export const deepClone = (() => {
  if (typeof structuredClone === 'function')
    return structuredClone

  return (obj: any) => {
    if (obj === null || typeof obj !== 'object')
      return obj

    if (obj instanceof Date)
      return new Date(obj.getTime())

    if (obj instanceof RegExp)
      return new RegExp(obj.source, obj.flags)

    if (Array.isArray(obj))
      return obj.map(item => deepClone(item))

    const res = new obj.constructor()
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key))
        res[key] = deepClone(obj[key])
    }
    return res
  }
})()
