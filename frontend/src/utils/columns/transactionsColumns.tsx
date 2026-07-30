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
  columnHelper.accessor("totalSaved", {
    header: "Total Saved",
    cell: (info) => `MK ${Number(info.getValue()).toLocaleString()}`,
  }),
  columnHelper.accessor("totalBorrowed", {
    header: "Borrowed",
    cell: (info) => `MK ${Number(info.getValue()).toLocaleString()}`,
  }),
  columnHelper.accessor("totalRepaid", {
    header: "Repaid",
    cell: (info) => `MK ${Number(info.getValue()).toLocaleString()}`,
  }),
  columnHelper.accessor("loanBalance", {
    header: "Outstanding Loan",
    cell: (info) => {
      const value = Number(info.getValue());
      return value > 0 ? `MK ${value.toLocaleString()}` : "-";
    },
  }),
  columnHelper.display({
    id: "paidStatus",
    header: "Status",
    cell: (info) => {
      const m = info.row.original;
      let status: "Yes" | "Partial" | "No" = "Yes";
      if (m.totalBorrowed > 0) {
        if (m.loanBalance === 0) status = "Yes";
        else if (m.totalRepaid > 0) status = "Partial";
        else status = "No";
      }
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
          {m.totalBorrowed > 0 ? status : "-"}
        </span>
      );
    },
  }),
  columnHelper.accessor("totalInterest", {
    header: "Interest",
    cell: (info) => `MK ${Number(info.getValue()).toLocaleString()}`,
  }),
  columnHelper.accessor("netPosition", {
    header: "Net Position",
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
