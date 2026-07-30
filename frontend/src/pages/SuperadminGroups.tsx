import { fetchGroups, updateGroupStatus } from "@/api/groups";
import type { Group } from "@/api/groups";
import GroupsTable from "@/components/superadmin/GroupsTable";
import GroupActionsModal from "@/components/superadmin/GroupActionsModal";
import CreateGroupModal from "@/components/superadmin/CreateGroupModal";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";

export default function SuperadminGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [viewTarget, setViewTarget] = useState<Group | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const loadGroups = () => {
    setLoading(true);
    fetchGroups()
      .then(setGroups)
      .catch(() => toast.error("Failed to load groups"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleToggleStatus = async (group: Group) => {
    const nextStatus = group.status === "active" ? "suspended" : "active";
    setTogglingId(group.id);
    try {
      const result = await updateGroupStatus(group.id, nextStatus);
      toast.success(result.message);
      loadGroups();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Village Banks</h1>
          <p className="text-gray-500 text-sm mt-1">
            Register new groups and manage their leaders.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition"
        >
          + New Village Bank
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            All Groups ({groups.length})
          </h2>
        </div>
        <GroupsTable groups={groups} loading={loading} onView={setViewTarget} />
      </div>

      <GroupActionsModal
        group={viewTarget}
        onClose={() => setViewTarget(null)}
        onToggleStatus={handleToggleStatus}
        togglingId={togglingId}
      />

      <CreateGroupModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          loadGroups();
        }}
      />
    </div>
  );
}
