interface Cast {
  src: string;
  time: number;
  class: string;
  key: symbol;
  logLine: number;
  GCDCast?: string;
  GCDClass?: string;
  APIData: Partial<XivApiJson>;
}
