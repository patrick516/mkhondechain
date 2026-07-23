import { Link, useLocation } from "react-router-dom";

const navItems = [
  { label: "Dashboard", path: "/" },
  { label: "Members", path: "/members" },
  { label: "Transactions", path: "/transactions" },
  { label: "Settings", path: "/settings" },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 text-white shadow-lg bg-primary flex flex-col">
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
      <div className="p-4 border-t border-blue-800">
        <p className="text-xs text-blue-300 text-center">MkhondeChain v1.0</p>
      </div>
    </aside>
  );
}
