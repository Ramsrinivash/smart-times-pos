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

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  handleReload = () => {
    try {
      localStorage.removeItem('watch_auth_user');
      localStorage.removeItem('watch_auth_token');
      localStorage.removeItem('watch_logout_reason');
    } catch (e) {}
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', background: '#0c0c0e', color: '#f3f4f6' }}>
          <div style={{ maxWidth: '440px', width: '100%', padding: '2rem', background: '#1c1c24', border: '1px solid #2b2b35', borderRadius: '12px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d4af37', marginBottom: '0.75rem' }}>Smart Times System Alert</h2>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              A temporary display error occurred. Click below to reload and restore your session safely.
            </p>
            <button 
              onClick={this.handleReload} 
              style={{ background: '#d4af37', color: '#000', fontWeight: 700, padding: '0.75rem 1.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%' }}
            >
              🔄 Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedLayout = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Checking authorization credentials...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user?.role || 'sales';
  if (allowedRoles && !allowedRoles.includes(userRole)) {
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
  React.useEffect(() => {
    // Disable Right-Click Context Menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // Disable Developer Tools & Inspect Shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S)
    const handleKeyDown = (e) => {
      // F12
      if (e.keyCode === 123) {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
        e.preventDefault();
        return false;
      }
      // Ctrl+U (View Source) or Ctrl+S (Save Page)
      if (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 83)) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

export default App;
