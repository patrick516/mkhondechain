import { createColumnHelper } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import type { MemberSummary } from "@/types/transactions";

const columnHelper = createColumnHelper<MemberSummary>();

export const transactionColumns = [
  columnHelper.accessor("firstName", {
    header: "First Name",
  }),
  columnHelper.accessor("surname", {
    header: "Surname",
  }),
  columnHelper.accessor("borrowed", {
    header: "Borrowed",
    cell: (info) => `MK ${Number(info.getValue()).toLocaleString()}`,
  }),
  columnHelper.accessor("repaid", {
    header: "Repaid",
    cell: (info) => `MK ${Number(info.getValue()).toLocaleString()}`,
  }),
  columnHelper.accessor("paidStatus", {
    header: "Paid",
    cell: (info) => {
      const status = info.getValue();
      return (
        <span
          className={`font-bold ${
            status === "Yes"
              ? "text-green-600"
              : status === "Partial"
              ? "text-yellow-600"
              : "text-red-600"
          }`}
        >
          {status}
        </span>
      );
    },
  }),
  columnHelper.accessor("debtor", {
    header: "Debtor",
    cell: (info) =>
      info.getValue() > 0
        ? `MK ${Number(info.getValue()).toLocaleString()}`
        : "-",
  }),
  columnHelper.accessor("interest", {
    header: "Interest",
    cell: (info) => `MK ${Number(info.getValue()).toLocaleString()}`,
  }),
  columnHelper.accessor("totalAmount", {
    header: "Total Amount",
    cell: (info) => `MK ${Number(info.getValue()).toLocaleString()}`,
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: (info) => {
      const member = info.row.original;
      return (
        <Link
          to={`/members/${member._id}/transactions`}
          className="text-blue-600 underline"
        >
          View
        </Link>
      );
    },
  }),
];
