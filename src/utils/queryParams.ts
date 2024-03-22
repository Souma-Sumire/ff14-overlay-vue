/* eslint-disable @typescript-eslint/no-explicit-any */
function queryString(str?: string) {
  if (!str) return {};
  const params = str.split("?")[1];
  if (!params) return {};
  const param = params.split("&");
  if (!param) return {};

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const obj: any = {};
  for (let i = 0; i < param.length; i++) {
    const paramsA = param[i].split("=");
    const key = paramsA[0];
    const value = paramsA[1];
    if (obj[key]) {
      obj[key] = Array.isArray(obj[key]) ? obj[key] : [obj[key]];
      obj[key].push(value);
    } else {
      obj[key] = value;
    }
  }
  return obj;
}
const params = queryString(location.href);
export { params };
