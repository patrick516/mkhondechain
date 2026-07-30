import { useEffect, useState } from "react";
import axios from "@/api/axios";
import toast from "react-hot-toast";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { memberColumns } from "@/utils/columns/membersColumns";
import type { Member } from "@/utils/columns/membersColumns";
import { FaPlus } from "react-icons/fa6";
import type { MemberPayload } from "@/types/dashboard";

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Form states

  // Form states
  const DEFAULT_PIN = "1234";
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");

  const fetchMembers = async () => {
    try {
      const res = await axios.get("/members");
      setMembers(res.data);
    } catch (err) {
      console.error("Failed to fetch members:", err);
    }
  };

  useEffect(() => {
    fetchMembers();
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

  const formatPhoneNumber = (input: string): string => {
    const trimmed = input.trim();
    if (trimmed.startsWith("0")) {
      return "+265" + trimmed.substring(1);
    }
    return trimmed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const formattedPhone = formatPhoneNumber(phone);

      const payload: MemberPayload = {
        firstName,
        surname,
        phone: formattedPhone,
        gender,
        pin: DEFAULT_PIN,
      };

      const res = await axios.post("/members", payload);
      console.log("Members from API:", res.data);

      toast.success(
        `Member added! Tell them their starting PIN is ${DEFAULT_PIN} — they'll be asked to change it the first time they dial in.`,
      );
      setShowModal(false);
      setFirstName("");
      setSurname("");
      setPhone("");
      setGender("");
      fetchMembers();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error adding member:", error.message);
      } else {
        console.error("Error adding member:", error);
      }
      toast.error("Failed to add member");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">All Members</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-white rounded bg-primary"
        >
          <FaPlus className="text-sm" /> Add Member
        </button>
      </div>

      {/* Global Search */}
      <div className="mb-4">
        <input
          type="text"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search by name, phone, or wallet..."
          className="w-full p-2 border rounded md:w-1/3"
        />
      </div>

      {/* Member Table */}
      <div className="p-4 overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id} className="px-4 py-2 text-left">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
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

        {/* Pagination Controls */}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md p-6 bg-white rounded shadow-lg">
            <h2 className="mb-1 text-xl font-semibold">Add Member</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                className="w-full p-2 border rounded"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                required
              />
              <input
                className="w-full p-2 border rounded"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="Surname"
                required
              />
              <select
                className="w-full p-2 border rounded"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                required
              >
                <option value="">Select Gender...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <input
                className="w-full p-2 border rounded"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone Number"
                required
              />
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Starting PIN (member changes this on first USSD login)
                </label>
                <input
                  className="w-full p-2 border rounded bg-gray-50 text-gray-500"
                  value={DEFAULT_PIN}
                  readOnly
                  disabled
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  className="px-4 py-2 text-white rounded bg-primary"
                  type="submit"
                >
                  Save Member
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  type="button"
                  className="px-4 py-2 text-gray-700 border rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
