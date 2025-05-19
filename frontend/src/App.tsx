import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import Members from "@/pages/Members";
import AddMember from "@/pages/AddMember";
import Transactions from "@/pages/Transactions";

import MemberTransactions from "@/pages/MemberTransactions";

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/members" element={<Members />} />
          <Route path="/add-member" element={<AddMember />} />
          <Route path="/transactions" element={<Transactions />} />

          <Route
            path="/members/:memberId/transactions"
            element={<MemberTransactions />}
          />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
