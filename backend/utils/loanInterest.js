// Prorated loan interest calculation.
// Interest accrues daily, based on the group's interestRate
// spread evenly across maxRepayDays — so someone who repays
// quickly owes less interest than someone who takes longer.
// ─────────────────────────────────────────────────────────────

function calculateAccruedInterest(
  principal,
  group,
  disbursedAt,
  asOfDate = new Date(),
) {
  const dailyRatePercent = group.interestRate / group.maxRepayDays;
  const msPerDay = 1000 * 60 * 60 * 24;

  let elapsedDays = Math.ceil(
    (asOfDate.getTime() - new Date(disbursedAt).getTime()) / msPerDay,
  );
  // Always charge at least 1 day, even if repaid within hours
  if (elapsedDays < 1) elapsedDays = 1;

  const interest = principal * (dailyRatePercent / 100) * elapsedDays;
  return Math.round(interest * 100) / 100;
}

module.exports = { calculateAccruedInterest };
