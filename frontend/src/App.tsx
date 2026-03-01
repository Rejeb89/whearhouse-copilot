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
// import Users from './pages/Users'
import Calendar from './pages/Calendar'
import Logs from './pages/Logs'
import Settings from './pages/Settings'
import Budgets from './pages/Budgets'
import Receipts from './pages/Receipts'
import Vehicles from './pages/Vehicles'
import Layout from './components/common/Layout'

const PrivateRoute: React.FC<{ roles?: string[]; children: JSX.Element }> = ({ roles, children }) => {
  const { user } = useContext(AuthContext)
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
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
            <Route path="/entities/:id" element={<PrivateRoute children={<EntityDetails />} />} />
            <Route path="/calendar" element={<PrivateRoute children={<Calendar />} />} />
            {/* <Route path="/users" element={<PrivateRoute roles={["ADMIN"]} children={<Users />} />} /> */}
            <Route path="/logs" element={<PrivateRoute roles={["ADMIN", "SECTION_CHIEF"]} children={<Logs />} />} />
            <Route path="/settings" element={<PrivateRoute roles={["ADMIN", "SECTION_CHIEF"]} children={<Settings />} />} />
            <Route path="/budgets" element={<PrivateRoute roles={["ADMIN", "SECTION_CHIEF"]} children={<Budgets />} />} />
            <Route path="/receipts" element={<PrivateRoute children={<Receipts />} />} />
            <Route path="/vehicles" element={<PrivateRoute children={<Vehicles />} />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  )
}
