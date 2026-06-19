import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (session) {
    const redirectTo = location.state?.from?.pathname || '/dashboard'
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: signInError } = await signIn(email, password)
    setSubmitting(false)
    if (signInError) {
      setError('Incorrect email or password.')
      return
    }
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="flex h-screen w-screen">
      <div className="hidden md:flex md:w-1/2 bg-navy items-start p-10">
        <span className="font-heading text-white text-2xl tracking-wide">Meridian</span>
      </div>

      <div className="flex w-full md:w-1/2 bg-cream items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h1 className="font-heading text-navy text-2xl mb-1">Sign in</h1>
          <p className="font-body text-sm text-slate/60 mb-8">Access your Meridian workspace.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block font-body text-xs text-slate/70 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded border border-slate/20 bg-white font-body text-sm text-navy focus:outline-none focus:border-teal"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block font-body text-xs text-slate/70 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded border border-slate/20 bg-white font-body text-sm text-navy focus:outline-none focus:border-teal"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="font-body text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full py-2.5 rounded bg-navy text-white font-body text-sm hover:bg-navy/90 transition-colors duration-150 disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>

            <a href="#" className="text-center font-body text-xs text-slate/50 hover:text-slate/70 transition-colors duration-150">
              Forgot password?
            </a>
          </form>
        </div>
      </div>
    </div>
  )
}
