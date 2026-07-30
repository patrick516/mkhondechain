import { useState } from "react";
import { createGroup } from "@/api/groups";
import Modal from "@/components/ui/Modal";
import toast from "react-hot-toast";

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateGroupModal({
  open,
  onClose,
  onCreated,
}: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [leaderUsername, setLeaderUsername] = useState("");
  const [leaderFullName, setLeaderFullName] = useState("");
  const [leaderPassword, setLeaderPassword] = useState("");
  const [leaderPhone, setLeaderPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setLocation("");
    setLeaderUsername("");
    setLeaderFullName("");
    setLeaderPassword("");
    setLeaderPhone("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createGroup({
        name: name.trim(),
        location: location.trim(),
        leaderUsername: leaderUsername.trim(),
        leaderFullName: leaderFullName.trim(),
        leaderPassword,
        leaderPhone: leaderPhone.trim() || undefined,
      });
      toast.success(`${name} created successfully`);
      resetForm();
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to create group");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Register New Village Bank">
      <p className="text-sm text-gray-500 mb-6">
        Creates the group and its leader's login in one step. The leader can
        then log in and add their own members.
      </p>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Group Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location (village/district)
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="col-span-2 border-t border-gray-100 pt-4 mt-2">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Group Leader's Login
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Leader Username
          </label>
          <input
            type="text"
            value={leaderUsername}
            onChange={(e) => setLeaderUsername(e.target.value)}
            required
            autoComplete="off"
            name="new-leader-username"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Leader Full Name
          </label>
          <input
            type="text"
            value={leaderFullName}
            onChange={(e) => setLeaderFullName(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Leader Password
          </label>
          <input
            type="password"
            value={leaderPassword}
            onChange={(e) => setLeaderPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            name="new-leader-password"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Leader Phone (optional)
          </label>
          <input
            type="text"
            value={leaderPhone}
            onChange={(e) => setLeaderPhone(e.target.value)}
            placeholder="+265XXXXXXXXX"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="col-span-2 flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Register Village Bank"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
