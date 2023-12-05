export const deepClone = (() => {
  if (typeof structuredClone === "function") {
    return structuredClone;
  } else {
    return (obj: any) => {
      if (obj === null || typeof obj !== "object") {
        return obj;
      }
      if (obj instanceof Date) {
        return new Date(obj.getTime());
      }
      if (obj instanceof RegExp) {
        return new RegExp(obj.source, obj.flags);
      }
      if (obj instanceof Array) {
        return obj.map((item) => deepClone(item));
      }
      const res = new obj.constructor();
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          res[key] = deepClone(obj[key]);
        }
      }
      return res;
    };
  }
})();
