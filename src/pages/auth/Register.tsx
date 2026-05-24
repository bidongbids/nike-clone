import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'
import './Auth.css'

interface FormState { name: string; email: string; password: string; confirm: string }
interface FieldErrors { name?: string; email?: string; password?: string; confirm?: string }

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Contains uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Contains number', ok: /\d/.test(password) },
    { label: 'Contains special character', ok: /[!@#$%^&*]/.test(password) },
  ]
  const score = checks.filter((c) => c.ok).length
  const colors = ['#f04048', '#f59e0b', '#f59e0b', '#22c55e', '#22c55e']
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']

  if (!password) return null
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {[1,2,3,4].map((i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= score ? colors[score] : 'var(--gray-200)', transition: 'background 0.2s' }} />
        ))}
        <span style={{ fontSize: 11, color: colors[score], fontWeight: 700, minWidth: 40, textAlign: 'right' }}>{labels[score]}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {checks.map((c) => (
          <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            {c.ok ? <CheckCircle2 size={12} color="#22c55e" /> : <XCircle size={12} color="var(--gray-300)" />}
            <span style={{ color: c.ok ? '#22c55e' : 'var(--gray-400)' }}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Register() {
  const [form, setForm] = useState<FormState>({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const { addToast } = useStore()
  const navigate = useNavigate()

  const setField = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const validate = (): boolean => {
    const e: FieldErrors = {}
    if (!form.name.trim()) e.name = 'Full name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (!form.confirm) e.confirm = 'Please confirm your password'
    else if (form.password !== form.confirm) e.confirm = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError('')
    if (!validate()) return
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.name } },
      })
      if (err) throw err
      addToast('Account created! Check your email to verify.', 'success')
      navigate('/login')
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally { setLoading(false) }
  }

  const passwordsMatch = form.confirm.length > 0 && form.password === form.confirm

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ overflowY: 'auto', maxHeight: '100vh' }}>
        <Link to="/" className="auth-logo">
          <svg viewBox="0 0 60 24" fill="none" style={{ width: 56, height: 22 }}>
            <path d="M6 18L42.5 4C44.5 3.2 46 3.5 46 5.5C46 7.5 43 10.5 40 12L6 18Z" fill="currentColor" />
          </svg>
        </Link>
        <h1 className="auth-title">Join Nike</h1>
        <p className="auth-sub">Create your account today</p>

        {serverError && <div className="auth-alert error">{serverError}</div>}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <input id="name" type="text" className={`form-input${errors.name ? ' error' : ''}`} value={form.name} onChange={setField('name')} placeholder="Juan dela Cruz" autoComplete="name" />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input id="email" type="email" className={`form-input${errors.email ? ' error' : ''}`} value={form.email} onChange={setField('email')} placeholder="you@example.com" autoComplete="email" />
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input id="password" type={showPw ? 'text' : 'password'} className={`form-input${errors.password ? ' error' : ''}`} value={form.password} onChange={setField('password')} placeholder="Min. 8 characters" autoComplete="new-password" style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPw((s) => !s)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="form-error">{errors.password}</p>}
            <PasswordStrength password={form.password} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input id="confirm" type={showConfirm ? 'text' : 'password'} className={`form-input${errors.confirm ? ' error' : ''}`} value={form.confirm} onChange={setField('confirm')} placeholder="Repeat your password" autoComplete="new-password" style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShowConfirm((s) => !s)} style={{ position: 'absolute', right: 44, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}>
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {form.confirm.length > 0 && (
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
                  {passwordsMatch ? <CheckCircle2 size={18} color="#22c55e" /> : <XCircle size={18} color="var(--red)" />}
                </span>
              )}
            </div>
            {errors.confirm && <p className="form-error">{errors.confirm}</p>}
          </div>

          <p style={{ fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.6 }}>
            By creating an account you agree to Nike's{' '}
            <a href="#" style={{ textDecoration: 'underline' }}>Privacy Policy</a> and{' '}
            <a href="#" style={{ textDecoration: 'underline' }}>Terms of Use</a>.
          </p>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ padding: '16px', fontSize: 16 }}>
            {loading ? <><span className="spinner" /> Creating account...</> : 'Create Account'}
          </button>
        </form>
        <p className="auth-switch">Already a member? <Link to="/login">Sign In</Link></p>
      </div>

      <div className="auth-visual">
        <img src="https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800&q=80" alt="Nike shoe" />
        <div className="auth-visual-overlay"><h2>BE A MEMBER.</h2></div>
      </div>
    </div>
  )
}
