import React, { useContext, useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { AuthContext } from '../../context/AuthContext'

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useContext(AuthContext)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const hideSidebar = user?.role === 'REGION_CHIEF' || user?.role === 'BATTALION_COMMANDER' || user?.role === 'DISTRICT_MANAGER'

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {user && !hideSidebar && (
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar onToggleSidebar={hideSidebar ? undefined : () => setSidebarOpen((o) => !o)} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}

export default Layout
