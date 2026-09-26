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
  Trash2,
  FolderOpen,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/orders", label: "Orders", icon: Package },
  { to: "/suppliers", label: "Suppliers", icon: Building2 },
  { to: "/invoicing", label: "Invoicing", icon: FileText },
  { to: "/team", label: "Team", icon: UserCog },
  { to: "/approvals", label: "Approvals", icon: Inbox },
  { to: "/documents.html", label: "Documents", icon: FolderOpen, external: true },
]

const bottom = [
  { to: '/trash', label: 'Trash', icon: Trash2 },
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

