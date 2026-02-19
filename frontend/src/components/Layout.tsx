import React, { useContext } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { AuthContext } from '../context/AuthContext'

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useContext(AuthContext)

  return (
    <div className="flex flex-row-reverse h-screen">
      {user && <Sidebar />}
      <main className={`${user ? 'flex-1' : 'w-full'} flex flex-col overflow-auto`}>
        {user && <TopBar />}
        <div className="flex-1 p-6 overflow-auto">{children}</div>
      </main>
    </div>
  )
}

export default Layout
