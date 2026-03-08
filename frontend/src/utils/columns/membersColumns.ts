import { createColumnHelper } from "@tanstack/react-table";

export interface Member {
  _id: string;
  firstName: string;
  surname: string;
  phone: string;
  gender: string;
  ethAddress: string;
  createdAt: string;
  savingsCount: number;
  borrowCount: number;
}

const columnHelper = createColumnHelper<Member>();

export const memberColumns = [
  columnHelper.accessor("firstName", {
    header: "First Name",
    enableColumnFilter: true,
  }),
  columnHelper.accessor("surname", {
    header: "Surname",
    enableColumnFilter: true,
  }),
  columnHelper.accessor("gender", {
    header: "Gender",
    enableColumnFilter: true,
  }),
  columnHelper.accessor("phone", {
    header: "Phone",
    enableColumnFilter: true,
  }),
  columnHelper.accessor("ethAddress", {
    header: "Wallet",
    enableColumnFilter: true,
  }),
  columnHelper.accessor("createdAt", {
    header: "Joined",
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
    enableColumnFilter: false,
  }),
  columnHelper.accessor("savingsCount", {
    header: "Saves",
    enableColumnFilter: false,
  }),
  columnHelper.accessor("borrowCount", {
    header: "Borrows",
    enableColumnFilter: false,
  }),
  columnHelper.display({
    id: "badge",
    header: "Badge",
    cell: (info) => {
      const value = info.row.original;
      const totalActivity =
        (value.savingsCount || 0) + (value.borrowCount || 0);

      if (totalActivity >= 20) return "🏅 Gold";
      if (totalActivity >= 10) return "🥈 Silver";
      if (totalActivity >= 5) return "🥉 Bronze";
      return "🔘 New";
    },
  }),
];
