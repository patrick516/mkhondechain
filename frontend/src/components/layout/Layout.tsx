import React from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen text-gray-900 bg-gray-100">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Navbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
