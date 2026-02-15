import type { ColumnDef } from '@/types/mitigation'
import Util from '@/utils/util'

export function getMitigationColumnDisplayName(col: Pick<ColumnDef, 'jobEnum' | 'key'>) {
  const job = Util.jobEnumToJob(col.jobEnum)
  const jobName = Util.jobToFullName(job)?.simple1
  if (jobName)
    return jobName.trim()
  const key = String(col.key || '').trim()
  const trimmed = key.split('(')[0]?.split('（')[0]?.trim()
  return trimmed || key
}
