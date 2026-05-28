// ─────────────────────────────────────────────────────────────
// Navbar
// Shows the current admin username and a logout button.
// ─────────────────────────────────────────────────────────────

import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function Navbar() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
      {/* Left — Page context */}
      <p className="text-sm text-gray-500">
        Welcome back,{" "}
        <span className="font-semibold text-gray-800 capitalize">
          {admin?.username || "Admin"}
        </span>
      </p>

      {/* Right — Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition font-medium"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        Logout
      </button>
    </header>
  );
}
