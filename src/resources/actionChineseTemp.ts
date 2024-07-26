const decChinese: Record<number, string> = {
  // 3601: '测试',
}

export function getActionChineseTemp(actionDecId: number): string | undefined {
  return decChinese[actionDecId]
}
