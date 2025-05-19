import { useEffect, useState } from "react";
import axios from "@/api/axios";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";

import toast from "react-hot-toast";
import type { MemberSummary } from "@/types/transactions";
import { transactionColumns } from "@/utils/columns/transactionsColumns";

export default function Transactions() {
  const [data, setData] = useState<MemberSummary[]>([]);

  useEffect(() => {
    axios
      .get("/transactions/summary")
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error("Failed to fetch transaction summary:", err.message);
        toast.error("Could not load transaction summary");
      });
  }, []);

  const table = useReactTable({
    data,
    columns: transactionColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Transaction Summary</h1>

      <div className="p-4 overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id} className="px-4 py-2 text-left">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
