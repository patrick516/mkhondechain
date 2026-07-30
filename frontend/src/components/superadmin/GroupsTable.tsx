import type { Group } from "@/api/groups";

interface GroupsTableProps {
  groups: Group[];
  loading: boolean;
  onView: (group: Group) => void;
}

export default function GroupsTable({
  groups,
  loading,
  onView,
}: GroupsTableProps) {
  if (loading) {
    return <p className="text-gray-500 text-sm p-6">Loading...</p>;
  }

  if (groups.length === 0) {
    return (
      <p className="text-gray-500 text-sm p-6">
        No groups registered yet — click "New Village Bank" above to create the
        first one.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="px-6 py-3 font-medium">Group</th>
            <th className="px-6 py-3 font-medium">Location</th>
            <th className="px-6 py-3 font-medium">Leader</th>
            <th className="px-6 py-3 font-medium">Members</th>
            <th className="px-6 py-3 font-medium">Status</th>
            <th className="px-6 py-3 font-medium text-right">View</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.id} className="border-b border-gray-50 last:border-0">
              <td className="px-6 py-4 font-semibold text-gray-800">
                {g.name}
              </td>
              <td className="px-6 py-4 text-gray-600">{g.location}</td>
              <td className="px-6 py-4 text-gray-600">{g.leader}</td>
              <td className="px-6 py-4 text-gray-600">{g.memberCount}</td>
              <td className="px-6 py-4">
                <span
                  className={`text-xs px-3 py-1 rounded-full ${
                    g.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {g.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => onView(g)}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 transition"
                  aria-label={`View ${g.name}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
