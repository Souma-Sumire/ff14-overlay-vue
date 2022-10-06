function queryString(str: string) {
  let params = str.split("?")[1];
  let param = params.split("&");
  let obj: any = {};
  for (let i = 0; i < param.length; i++) {
    let paramsA = param[i].split("=");
    let key = paramsA[0];
    let value = paramsA[1];
    if (obj[key]) {
      obj[key] = Array.isArray(obj[key]) ? obj[key] : [obj[key]];
      obj[key].push(value);
    } else {
      obj[key] = value;
    }
  }
  return obj;
}
export function getParams(): Record<string, string> {
  return queryString(location.href);
}
