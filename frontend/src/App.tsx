import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
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
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/members" element={<Members />} />
                    <Route path="/add-member" element={<AddMember />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/admin/deposit" element={<AddDeposit />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route
                      path="/members/:memberId/transactions"
                      element={<MemberTransactions />}
                    />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
