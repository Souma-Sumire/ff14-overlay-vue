import { getRoleColor, getRoleDisplayName, ROLE_DEFINITIONS } from './lootParser'

export function getChartLabelRich(_playerVisibility?: string) {
  // 保持参数以便未来扩展，使用下划线避免 lint 警告
  return {
    ...Object.fromEntries(
      ROLE_DEFINITIONS.map(r => [r, {
        fontSize: 10,
        fontWeight: 'bold',
        color: getRoleColor(r),
        align: 'center',
        padding: [0, 0, 2, 0]
      }])
    ),
    ...Object.fromEntries(
      ROLE_DEFINITIONS.map(r => [r + 'Big', {
        fontSize: 12,
        fontWeight: 'bold',
        color: getRoleColor(r),
        align: 'center'
      }])
    ),
    role: { fontSize: 10, fontWeight: 'bold', color: '#64748b', align: 'center', padding: [0, 0, 2, 0] },
    roleBig: { fontSize: 12, fontWeight: 'bold', color: '#1e293b', align: 'center' },
    left: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8', align: 'center', padding: [0, 0, 2, 0] },
    leftBig: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', align: 'center' },
    sub: { fontSize: 10, fontWeight: 'bold', color: '#f59e0b', align: 'center', padding: [0, 0, 2, 0] },
    subBig: { fontSize: 12, fontWeight: 'bold', color: '#f59e0b', align: 'center' },
    name: {
      fontSize: 12,
      fontWeight: 'normal',
      color: '#1e293b',
      align: 'center',
      width: 60,
      overflow: 'break',
    },
    nameLeft: {
      fontSize: 12,
      fontWeight: 'normal',
      color: '#94a3b8',
      align: 'center',
      width: 60,
      overflow: 'break',
    },
  }
}

export function formatChartPlayerLabel(value: string, rawRole: string | undefined, playerVisibility?: string) {
  const roleDisplay = rawRole ? getRoleDisplayName(rawRole) : ''
  
  let styleKey = rawRole || 'role'
  if (rawRole?.startsWith('LEFT:')) styleKey = 'left'
  if (rawRole?.startsWith('SUB:')) styleKey = 'sub'

  if (playerVisibility === 'role') {
    const bigKey = (styleKey === 'left' || styleKey === 'sub') ? styleKey + 'Big' : (rawRole || 'roleBig')
    return roleDisplay ? `{${bigKey}|${roleDisplay}}` : value
  }

  if (roleDisplay) {
    const nameKey = styleKey === 'left' ? 'nameLeft' : 'name'
    const roleKey = (styleKey === 'left' || styleKey === 'sub') ? styleKey : (rawRole || 'role')
    return `{${roleKey}|${roleDisplay}}\n{${nameKey}|${value}}`
  }
  return value
}
