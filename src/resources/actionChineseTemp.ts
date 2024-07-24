const tempChinese: Record<string, string> = {

}

export function getActionChineseTemp(actionDecId: string): string | undefined {
  return tempChinese[actionDecId]
}
