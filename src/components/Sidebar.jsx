import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Package,
  Building2,
  FileText,
  UserCog,
  Settings,
  LogOut,
  Inbox,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/orders', label: 'Orders', icon: Package },
  { to: '/suppliers', label: 'Suppliers', icon: Building2 },
  { to: '/invoicing', label: 'Invoicing', icon: FileText },
  { to: '/team', label: 'Team', icon: UserCog },
  { to: '/approvals', label: 'Approvals', icon: Inbox },
]

const bottom = [
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-navy flex flex-col h-full">
      {/* Wordmark */}
      <div className="px-6 py-6 border-b border-white/10">
        <span className="font-heading text-white text-lg tracking-wide">Meridian</span>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded text-sm font-body transition-colors duration-150 ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/55 hover:text-white/85 hover:bg-white/5'
              }`
            }
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 pb-5 flex flex-col gap-0.5 border-t border-white/10 pt-3">
        {bottom.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded text-sm font-body transition-colors duration-150 ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/55 hover:text-white/85 hover:bg-white/5'
              }`
            }
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded text-sm font-body text-white/55 hover:text-white/85 hover:bg-white/5 transition-colors duration-150"
        >
          <LogOut size={16} strokeWidth={1.75} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
