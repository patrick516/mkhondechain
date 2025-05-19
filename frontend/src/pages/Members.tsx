import { useEffect, useState } from "react";
import axios from "@/api/axios";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { memberColumns } from "@/utils/columns/membersColumns";
import type { Member } from "@/utils/columns/membersColumns";

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  useEffect(() => {
    axios
      .get("/members")
      .then((res) => setMembers(res.data))
      .catch((err) => console.error("Failed to fetch members:", err));
  }, []);

  const table = useReactTable({
    data: members,
    columns: memberColumns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "includesString",
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">All Members</h1>

      {/* 🔍 Global Search */}
      <div className="mb-4">
        <input
          type="text"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search by name, phone, or wallet..."
          className="w-full p-2 border rounded md:w-1/3"
        />
      </div>

      {/* 📋 Member Table */}
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

        {/* 🔁 Pagination Controls */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
