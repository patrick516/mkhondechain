import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const adminNavItems = [
  { label: "Dashboard", path: "/" },
  { label: "Members", path: "/members" },
  { label: "Transactions", path: "/transactions" },
  { label: "Disputes", path: "/disputes" },
  { label: "Payouts", path: "/payouts" },
  { label: "Settings", path: "/settings" },
];
const superadminNavItems = [
  { label: "Dashboard", path: "/" },
  { label: "Village Banks", path: "/village-banks" },
];

export default function Sidebar() {
  const location = useLocation();
  const { admin } = useAuth();
  const navItems =
    admin?.role === "superadmin" ? superadminNavItems : adminNavItems;

  return (
    <aside className="w-64 h-full overflow-y-auto text-white shadow-lg bg-primary flex flex-col">
      {/* Logo */}
      <div className="flex flex-col items-center p-6 border-b border-blue-800">
        <img
          src="/mkhondeChain.webp"
          alt="MkhondeChain Logo"
          className="h-12 mb-2"
        />
        <span className="text-xl font-bold">MkhondeChain</span>
      </div>

      {/* Nav */}
      <nav className="p-4 space-y-2 flex-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`block px-4 py-2 rounded hover:bg-accent transition ${
              location.pathname === item.path ? "bg-accent font-semibold" : ""
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-blue-800 space-y-1">
        {admin?.role !== "superadmin" && admin?.groupId && (
          <p className="text-[10px] text-blue-300 text-center break-all">
            Group ID: {admin.groupId}
          </p>
        )}
        <p className="text-xs text-blue-300 text-center">MkhondeChain v1.0</p>
      </div>
    </aside>
  );
}
