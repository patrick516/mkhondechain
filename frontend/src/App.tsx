import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "./components/layout/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Members from "@/pages/Members";
import AddMember from "@/pages/AddMember";
import Transactions from "@/pages/Transactions";
import AddDeposit from "./pages/AddDeposit";
import MemberTransactions from "@/pages/MemberTransactions";
import Settings from "@/pages/Settings";
import Payouts from "@/pages/Payouts";
import SuperadminGroups from "@/pages/SuperadminGroups";
import Disputes from "@/pages/Disputes";
import SuperadminDashboard from "@/pages/SuperadminDashboard";

// Branches by role, both inside the same Layout/Sidebar shell.
// Superadmin only ever gets "/" (Village Banks) — any other path
// redirects back, since the sidebar only exposes that one link
// but a typed URL could still reach these routes otherwise.
function RoleRouter() {
  const { admin } = useAuth();
  const isSuperadmin = admin?.role === "superadmin";

  return (
    <Layout>
      <Routes>
        {isSuperadmin ? (
          <>
            <Route path="/" element={<SuperadminDashboard />} />
            <Route path="/village-banks" element={<SuperadminGroups />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/members" element={<Members />} />
            <Route path="/add-member" element={<AddMember />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/admin/deposit" element={<AddDeposit />} />
            <Route path="/payouts" element={<Payouts />} />
            <Route path="/disputes" element={<Disputes />} />
            <Route path="/settings" element={<Settings />} />
            <Route
              path="/members/:memberId/transactions"
              element={<MemberTransactions />}
            />
          </>
        )}
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <RoleRouter />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
