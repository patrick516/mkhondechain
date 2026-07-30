// Share-out calculation engine.
// Computes, for every active member in a group, their entitled
// share of the total fund (cash + outstanding loans), nets it
// against anything they owe (including not-yet-applied prorated
// interest), and returns a full preview — used identically by
// both the preview endpoint and the actual close/commit step.
// ─────────────────────────────────────────────────────────────

const { calculateAccruedInterest } = require("./loanInterest");

async function computeShareoutPreview(prisma, groupId) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new Error("Group not found");
  }

  const members = await prisma.member.findMany({
    where: { groupId, status: "active" },
  });

  // For each member with an outstanding loan, find any not-yet-applied
  // prorated interest so the netting reflects the REAL amount owed
  // right now, not just the stored (possibly stale) loanBalance.
  const memberDebts = await Promise.all(
    members.map(async (member) => {
      let owedIncludingInterest = member.loanBalance;

      if (member.loanBalance > 0) {
        const activeLoan = await prisma.transaction.findFirst({
          where: { memberId: member.id, type: "borrow", status: "success" },
          orderBy: { createdAt: "desc" },
        });

        if (
          activeLoan &&
          !activeLoan.interestApplied &&
          activeLoan.disbursedAt
        ) {
          const accrued = calculateAccruedInterest(
            activeLoan.amount,
            group,
            activeLoan.disbursedAt,
          );
          owedIncludingInterest += accrued;
        }
      }

      return { member, owedIncludingInterest };
    }),
  );

  const totalGroupSavings = members.reduce((sum, m) => sum + m.totalSaved, 0);
  const totalOutstandingLoans = memberDebts.reduce(
    (sum, m) => sum + m.owedIncludingInterest,
    0,
  );
  const totalPotValue = group.fundBalance + totalOutstandingLoans;

  const memberResults = memberDebts.map(({ member, owedIncludingInterest }) => {
    const entitledShare =
      totalGroupSavings > 0
        ? (member.totalSaved / totalGroupSavings) * totalPotValue
        : 0;

    const loanOffset = Math.min(entitledShare, owedIncludingInterest);
    const cashPayout = Math.max(0, entitledShare - owedIncludingInterest);
    const remainingLoanBalance = Math.max(
      0,
      owedIncludingInterest - entitledShare,
    );

    return {
      memberId: member.id,
      firstName: member.firstName,
      surname: member.surname,
      phone: member.phone,
      totalSaved: member.totalSaved,
      owedIncludingInterest: Math.round(owedIncludingInterest * 100) / 100,
      entitledShare: Math.round(entitledShare * 100) / 100,
      loanOffset: Math.round(loanOffset * 100) / 100,
      cashPayout: Math.round(cashPayout * 100) / 100,
      remainingLoanBalance: Math.round(remainingLoanBalance * 100) / 100,
    };
  });

  return {
    groupId: group.id,
    totalGroupSavings,
    totalOutstandingLoans: Math.round(totalOutstandingLoans * 100) / 100,
    totalPotValue: Math.round(totalPotValue * 100) / 100,
    totalCashPayout:
      Math.round(
        memberResults.reduce((sum, m) => sum + m.cashPayout, 0) * 100,
      ) / 100,
    members: memberResults,
  };
}

module.exports = { computeShareoutPreview };
