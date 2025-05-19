import { Link, useLocation } from "react-router-dom";

const navItems = [
  { label: "Dashboard", path: "/" },
  { label: "Add Member", path: "/add-member" },
  { label: "Members", path: "/members" },
  { label: "Transactions", path: "/transactions" },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 text-white shadow-lg bg-primary">
      <div className="flex flex-col items-center p-6 border-b border-blue-800">
        <img
          src="/mkhondeChain.webp"
          alt="MkhondeChain Logo"
          className="h-12 mb-2"
        />
        <span className="text-xl font-bold">MkhondeChain</span>
      </div>

      <nav className="p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`block px-4 py-2 rounded hover:bg-accent ${
              location.pathname === item.path ? "bg-accent font-semibold" : ""
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
