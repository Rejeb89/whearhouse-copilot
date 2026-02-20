import React, { useContext } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { AuthContext } from '../context/AuthContext'

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useContext(AuthContext)

  return (
    <div className="flex h-screen">
      {user && <Sidebar />}
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}

export default Layout
