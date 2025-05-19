import { createColumnHelper } from "@tanstack/react-table";

export interface Member {
  _id: string;
  firstName: string;
  surname: string;
  phone: string;
  gender: string;
  ethAddress: string;
  createdAt: string;
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
];
