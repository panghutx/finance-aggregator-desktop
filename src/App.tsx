import { Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import Dashboard from "@/pages/Dashboard";
import Accounts from "@/pages/Accounts";
import Assets from "@/pages/Assets";
import Transactions from "@/pages/Transactions";
import Incomes from "@/pages/Incomes";
import Reports from "@/pages/Reports";
import BatchAssets from "@/pages/BatchAssets";

export default function App() {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="md:pl-64">
          <Header />
          <main className="p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/assets/batch" element={<BatchAssets />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/incomes" element={<Incomes />} />
              <Route path="/reports" element={<Reports />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}