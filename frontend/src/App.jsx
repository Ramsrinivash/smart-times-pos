import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Layout/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Purchase from './pages/Purchase';
import Sales from './pages/Sales';
import SalesReturn from './pages/SalesReturn';
import Exchanges from './pages/Exchanges';
import ServiceRepair from './pages/ServiceRepair';
import Customers from './pages/Customers';
import WarrantyCards from './pages/WarrantyCards';
import StockAdjustment from './pages/StockAdjustment';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import SupplierLedger from './pages/SupplierLedger';
import AttendancePayroll from './pages/AttendancePayroll';
import BillTemplate from './pages/BillTemplate';

const ProtectedLayout = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Checking authorization credentials...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Dashboard */}
            <Route path="/dashboard" element={
              <ProtectedLayout allowedRoles={['admin', 'manager', 'sales']}>
                <Dashboard />
              </ProtectedLayout>
            } />

            {/* Inventory */}
            <Route path="/inventory" element={
              <ProtectedLayout allowedRoles={['admin', 'manager', 'sales']}>
                <Inventory />
              </ProtectedLayout>
            } />
            <Route path="/inventory/adjustments" element={
              <ProtectedLayout allowedRoles={['admin', 'manager']}>
                <StockAdjustment />
              </ProtectedLayout>
            } />

            {/* Purchase */}
            <Route path="/purchase" element={
              <ProtectedLayout allowedRoles={['admin', 'manager']}>
                <Purchase />
              </ProtectedLayout>
            } />

            {/* Supplier Ledger */}
            <Route path="/supplier-ledger" element={
              <ProtectedLayout allowedRoles={['admin', 'manager']}>
                <SupplierLedger />
              </ProtectedLayout>
            } />

            {/* Sales */}
            <Route path="/sales" element={
              <ProtectedLayout allowedRoles={['admin', 'manager', 'sales']}>
                <Sales />
              </ProtectedLayout>
            } />
            <Route path="/returns" element={
              <ProtectedLayout allowedRoles={['admin', 'manager', 'sales']}>
                <SalesReturn />
              </ProtectedLayout>
            } />

            {/* Exchanges */}
            <Route path="/exchanges" element={
              <ProtectedLayout allowedRoles={['admin', 'manager', 'sales']}>
                <Exchanges />
              </ProtectedLayout>
            } />

            {/* Services */}
            <Route path="/services" element={
              <ProtectedLayout allowedRoles={['admin', 'manager', 'sales']}>
                <ServiceRepair />
              </ProtectedLayout>
            } />

            {/* Customers */}
            <Route path="/customers" element={
              <ProtectedLayout allowedRoles={['admin', 'manager', 'sales']}>
                <Customers />
              </ProtectedLayout>
            } />

            {/* Warranty Cards */}
            <Route path="/warranty" element={
              <ProtectedLayout allowedRoles={['admin', 'manager', 'sales']}>
                <WarrantyCards />
              </ProtectedLayout>
            } />

            {/* Reports */}
            <Route path="/reports" element={
              <ProtectedLayout allowedRoles={['admin', 'manager', 'sales']}>
                <Reports />
              </ProtectedLayout>
            } />

            {/* Settings — Admin only */}
            <Route path="/settings" element={
              <ProtectedLayout allowedRoles={['admin']}>
                <Settings />
              </ProtectedLayout>
            } />

            {/* Attendance & Payroll */}
            <Route path="/attendance" element={
              <ProtectedLayout allowedRoles={['admin', 'manager']}>
                <AttendancePayroll />
              </ProtectedLayout>
            } />

            {/* Bill Template Designer (Redirects to System Configuration) */}
            <Route path="/bill-template" element={<Navigate to="/settings?tab=bill_designer" replace />} />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
