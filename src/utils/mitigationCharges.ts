export const PREPULL_BASELINE_SECONDS = -30

export function simulateChargeStateAtTime(
  usageTimes: number[],
  at: number,
  maxCharges: number,
  recast: number,
) {
  let charges = maxCharges
  let nextRechargeAt = PREPULL_BASELINE_SECONDS

  for (const useTime of usageTimes) {
    if (useTime >= at)
      break

    while (nextRechargeAt <= useTime && charges < maxCharges) {
      nextRechargeAt += recast
      charges++
      if (charges === maxCharges)
        break
    }

    if (charges === maxCharges)
      nextRechargeAt = useTime + recast

    charges--

    if (charges === maxCharges - 1 && nextRechargeAt <= useTime)
      nextRechargeAt = useTime + recast
  }

  while (nextRechargeAt <= at && charges < maxCharges) {
    nextRechargeAt += recast
    charges++
  }

  return { charges, nextRechargeAt }
}

export function getFirstChargeDeficitTime(
  usageTimes: number[],
  maxCharges: number,
  recast: number,
) {
  let charges = maxCharges
  let nextRechargeAt = PREPULL_BASELINE_SECONDS

  for (const useTime of usageTimes) {
    while (nextRechargeAt <= useTime && charges < maxCharges) {
      nextRechargeAt += recast
      charges++
      if (charges === maxCharges)
        break
    }

    if (charges === maxCharges)
      nextRechargeAt = useTime + recast

    if (charges <= 0)
      return useTime

    charges--

    if (charges === maxCharges - 1 && nextRechargeAt <= useTime)
      nextRechargeAt = useTime + recast
  }

  return null
}
