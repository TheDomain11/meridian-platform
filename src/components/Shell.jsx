import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import AIAssistant from './ai/AIAssistant.jsx'
import AIShellBar from './ai/AIShellBar.jsx'
import { useAppContext } from '../context/AppContext.jsx'

export default function Shell() {
  const { loading, error } = useAppContext()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-cream">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-navy/20 border-t-teal rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate/60 font-body">Loading Meridian…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-cream">
        <div className="text-center max-w-sm px-6">
          <p className="text-sm font-heading text-navy mb-2">Connection error</p>
          <p className="text-xs text-slate/60 font-body">{error}</p>
          <p className="text-xs text-slate/40 font-body mt-4">Check your .env credentials and Supabase project status.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto bg-cream pb-14">
        <Outlet />
      </main>
      <AIAssistant />
      <AIShellBar />
    </div>
  )
}
