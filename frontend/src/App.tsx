import React, { useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, AuthContext } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Items from './pages/Items'
import Receptions from './pages/Receptions'
import Distributions from './pages/Distributions'
import Entities from './pages/Entities'
import EntityDetails from './pages/EntityDetails'
import Calendar from './pages/Calendar'
import Logs from './pages/Logs'
import Settings from './pages/Settings'
import Budgets from './pages/Budgets'
import Receipts from './pages/Receipts'
import Vehicles from './pages/Vehicles'
import AdminMonitoring from './pages/AdminMonitoring'
import MonitoringItemDetail from './pages/MonitoringItemDetail'
import Projects from './pages/Projects'
import Fuel from './pages/Fuel'
import Layout from './components/common/Layout'

const MONITORING_ONLY_ROLES = ['REGION_CHIEF', 'BATTALION_COMMANDER', 'DISTRICT_MANAGER']
const MONITORING_DEFAULT_ROLES = ['ADMIN', 'REGION_CHIEF', 'BATTALION_COMMANDER', 'DISTRICT_MANAGER']

const PrivateRoute: React.FC<{ roles?: string[]; children: JSX.Element }> = ({ roles, children }) => {
  const { user } = useContext(AuthContext)
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) {
    // Monitoring-only/admin roles have a restricted set of pages — send them to their home
    return <Navigate to={MONITORING_DEFAULT_ROLES.includes(user.role) ? '/monitoring' : '/'} replace />
  }
  // Redirect admin and monitoring-only roles away from root dashboard to monitoring
  if (!roles && MONITORING_DEFAULT_ROLES.includes(user.role)) {
    return <Navigate to="/monitoring" replace />
  }
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route path="/receptions" element={<PrivateRoute children={<Receptions />} />} />
            <Route path="/items" element={<PrivateRoute children={<Items />} />} />
            <Route path="/distributions" element={<PrivateRoute children={<Distributions />} />} />
            <Route path="/entities" element={<PrivateRoute children={<Entities />} />} />
            <Route path="/entities/:id" element={<PrivateRoute roles={["ADMIN", "SECTION_CHIEF", "USER", "REGION_CHIEF", "BATTALION_COMMANDER", "DISTRICT_MANAGER"]} children={<EntityDetails />} />} />
            <Route path="/calendar" element={<PrivateRoute roles={["ADMIN", "SECTION_CHIEF", "USER", "REGION_CHIEF", "BATTALION_COMMANDER", "DISTRICT_MANAGER"]} children={<Calendar />} />} />
            {/* <Route path="/users" element={<PrivateRoute roles={["ADMIN"]} children={<Users />} />} /> */}
            <Route path="/logs" element={<PrivateRoute roles={["ADMIN", "SECTION_CHIEF"]} children={<Logs />} />} />
            <Route path="/settings" element={<PrivateRoute roles={["ADMIN", "SECTION_CHIEF"]} children={<Settings />} />} />
            <Route path="/budgets" element={<PrivateRoute roles={["ADMIN", "SECTION_CHIEF"]} children={<Budgets />} />} />
            <Route path="/receipts" element={<PrivateRoute children={<Receipts />} />} />
            <Route path="/vehicles" element={<PrivateRoute children={<Vehicles />} />} />
            <Route path="/monitoring/units/:unit/items/:itemId" element={<PrivateRoute roles={["ADMIN", "REGION_CHIEF", "BATTALION_COMMANDER", "DISTRICT_MANAGER"]} children={<MonitoringItemDetail />} />} />
            <Route path="/monitoring" element={<PrivateRoute roles={["ADMIN", "REGION_CHIEF", "BATTALION_COMMANDER", "DISTRICT_MANAGER"]} children={<AdminMonitoring />} />} />
            <Route path="/projects" element={<PrivateRoute children={<Projects />} />} />
            <Route path="/fuel" element={<PrivateRoute children={<Fuel />} />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  )
}
