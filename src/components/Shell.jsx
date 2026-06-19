import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'

export default function Shell() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto bg-cream">
        <Outlet />
      </main>
    </div>
  )
}
