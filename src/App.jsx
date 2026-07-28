import { Routes, Route, Navigate } from 'react-router-dom'
import Shell from './components/Shell.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Clients from './pages/Clients.jsx'
import ClientDetail from './pages/ClientDetail.jsx'
import Orders from './pages/Orders.jsx'
import OrderDetail from './pages/OrderDetail.jsx'
import Suppliers from './pages/Suppliers.jsx'
import SupplierDetail from './pages/SupplierDetail.jsx'
import Invoicing from './pages/Invoicing.jsx'
import InvoiceDetail from './pages/InvoiceDetail.jsx'
import Team from './pages/Team.jsx'
import MemberDetail from './pages/MemberDetail.jsx'
import Settings from './pages/Settings.jsx'
import Approvals from './pages/Approvals.jsx'
import Trash from './pages/Trash.jsx'
import { AppProvider } from './context/AppContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppProvider>
                <Shell />
              </AppProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="suppliers/:id" element={<SupplierDetail />} />
          <Route path="invoicing" element={<Invoicing />} />
          <Route path="invoicing/:id" element={<InvoiceDetail />} />
          <Route path="team" element={<Team />} />
          <Route path="team/:id" element={<MemberDetail />} />
          <Route path="settings" element={<Settings />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="approvals/:id" element={<Approvals />} />
          <Route path="trash" element={<Trash />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
