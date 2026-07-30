import React from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import CycleCountdownBanner from "@/components/cycle/CycleCountdownBanner";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden text-gray-900 bg-gray-100">
      <Sidebar />
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <Navbar />
        <CycleCountdownBanner />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
