// backend/utils/prismaClient.js

// ─────────────────────────────────────────────────────────
// Shared Prisma Client instance.
// Import this everywhere instead of creating `new PrismaClient()`
// repeatedly — Prisma recommends a single shared instance per
// process to avoid exhausting the database connection pool.
//
// This instance is also extended to enforce, at the application
// layer, that Transaction.groupId and Payout.groupId always match
// the referenced member's actual groupId. This keeps every group's
// ledger provably isolated from every other group's, no matter how
// many groups the system runs across Malawi. See system docs,
// "Ledger Integrity" section, for the reasoning.
// ─────────────────────────────────────────────────────────────

const { PrismaClient } = require("@prisma/client");

const basePrisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "warn", "error"]
      : ["warn", "error"],
});

async function assertGroupMatchesMember(client, memberId, groupId, context) {
  const member = await client.member.findUnique({
    where: { id: memberId },
    select: { groupId: true },
  });

  if (!member) {
    throw new Error(`${context}: memberId ${memberId} does not exist`);
  }

  if (member.groupId !== groupId) {
    throw new Error(
      `${context}: groupId (${groupId}) does not match member's groupId ` +
        `(${member.groupId}) for memberId ${memberId}`,
    );
  }
}

const prisma = basePrisma.$extends({
  query: {
    transaction: {
      async create({ args, query }) {
        await assertGroupMatchesMember(
          basePrisma,
          args.data.memberId,
          args.data.groupId,
          "Transaction.create",
        );
        return query(args);
      },

      async update({ args, query }) {
        if ("groupId" in args.data || "memberId" in args.data) {
          const current = await basePrisma.transaction.findUniqueOrThrow({
            where: args.where,
            select: { memberId: true, groupId: true },
          });

          const nextMemberId = args.data.memberId ?? current.memberId;
          const nextGroupId = args.data.groupId ?? current.groupId;

          await assertGroupMatchesMember(
            basePrisma,
            nextMemberId,
            nextGroupId,
            "Transaction.update",
          );
        }
        return query(args);
      },
    },

    payout: {
      async create({ args, query }) {
        await assertGroupMatchesMember(
          basePrisma,
          args.data.memberId,
          args.data.groupId,
          "Payout.create",
        );
        return query(args);
      },
    },
  },
});

module.exports = prisma;
