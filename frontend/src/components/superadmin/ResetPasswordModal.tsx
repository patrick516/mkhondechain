// import { useState } from "react";
// import { resetLeaderPassword } from "@/api/groups";
// import type { Group } from "@/api/groups";
// import Modal from "@/components/ui/Modal";
// import toast from "react-hot-toast";

// interface ResetPasswordModalProps {
//   group: Group | null;
//   onClose: () => void;
// }

// export default function ResetPasswordModal({
//   group,
//   onClose,
// }: ResetPasswordModalProps) {
//   const [newPassword, setNewPassword] = useState("");
//   const [saving, setSaving] = useState(false);

//   const handleSave = async () => {
//     if (!group) return;
//     if (newPassword.length < 8) {
//       toast.error("Password must be at least 8 characters");
//       return;
//     }
//     setSaving(true);
//     try {
//       const result = await resetLeaderPassword(group.id, newPassword);
//       toast.success(result.message);
//       setNewPassword("");
//       onClose();
//     } catch (err: any) {
//       toast.error(err?.response?.data?.error || "Failed to reset password");
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <Modal
//       open={!!group}
//       onClose={onClose}
//       title={`Reset Password — ${group?.name || ""}`}
//     >
//       <p className="text-sm text-gray-500 mb-4">
//         This sets a new password for <strong>{group?.leader}</strong> and clears
//         any login lockout. Share the new password with them directly.
//       </p>
//       <input
//         type="password"
//         value={newPassword}
//         onChange={(e) => setNewPassword(e.target.value)}
//         placeholder="New password (min 8 characters)"
//         autoComplete="new-password"
//         className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-4"
//       />
//       <div className="flex justify-end gap-3">
//         <button
//           onClick={onClose}
//           className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
//         >
//           Cancel
//         </button>
//         <button
//           onClick={handleSave}
//           disabled={saving}
//           className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60"
//         >
//           {saving ? "Saving..." : "Reset Password"}
//         </button>
//       </div>
//     </Modal>
//   );
// }
