import { useState } from 'react'
import { Star, ThumbsUp, Check, Loader } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useReviews } from '../lib/hooks'
import { submitReview } from '../lib/api'

interface ReviewsProps { productId: number; productName: string }

function StarRow({ rating, interactive = false, onRate }: { rating: number; interactive?: boolean; onRate?: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1,2,3,4,5].map((n) => {
        const filled = (interactive ? hover || rating : rating) >= n
        return (
          <Star key={n} size={interactive ? 24 : 14}
            fill={filled ? '#f59e0b' : 'none'} stroke={filled ? '#f59e0b' : '#d4d4d4'}
            style={{ cursor: interactive ? 'pointer' : 'default' }}
            onMouseEnter={() => interactive && setHover(n)}
            onMouseLeave={() => interactive && setHover(0)}
            onClick={() => interactive && onRate?.(n)} />
        )
      })}
    </div>
  )
}

export default function Reviews({ productId, productName }: ReviewsProps) {
  const { user } = useStore()
  const { data: reviews, loading, refetch } = useReviews(productId)

  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const allReviews = reviews ?? []
  const avg = allReviews.length ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length : 0
  const dist = [5,4,3,2,1].map((n) => ({ n, count: allReviews.filter((r) => r.rating === n).length }))

  const validate = () => {
    const e: Record<string,string> = {}
    if (!rating) e.rating = 'Please select a star rating'
    if (!title.trim()) e.title = 'Title is required'
    if (body.trim().length < 20) e.body = 'Review must be at least 20 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    if (!user) return
    setSubmitting(true)
    try {
      await submitReview({ product_id: productId, user_id: user.id, rating, title, body })
      setSubmitted(true); setShowForm(false)
      setRating(0); setTitle(''); setBody('')
      await refetch()
    } catch (err: any) {
      setErrors({ body: err.message || 'Failed to submit review' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ marginTop: 60, paddingTop: 48, borderTop: '1px solid var(--gray-200)' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginBottom: 32 }}>
        Reviews ({loading ? '…' : allReviews.length})
      </h2>

      {/* Summary */}
      {allReviews.length > 0 && (
        <div style={{ display: 'flex', gap: 48, marginBottom: 40, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 64, lineHeight: 1 }}>{avg.toFixed(1)}</p>
            <StarRow rating={Math.round(avg)} />
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 6 }}>{allReviews.length} reviews</p>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            {dist.map(({ n, count }) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 13, width: 8 }}>{n}</span>
                <Star size={12} fill="#f59e0b" stroke="#f59e0b" />
                <div style={{ flex: 1, height: 8, background: 'var(--gray-100)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${allReviews.length ? (count / allReviews.length) * 100 : 0}%`, background: '#f59e0b', borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--gray-500)', width: 16 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      {!user ? (
        <div style={{ background: 'var(--gray-50)', borderRadius: 10, padding: '16px 20px', marginBottom: 28, fontSize: 14, color: 'var(--gray-600)' }}>
          <a href="/login" style={{ color: 'var(--black)', fontWeight: 700, textDecoration: 'underline' }}>Sign in</a> to write a review
        </div>
      ) : submitted ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 28, fontSize: 14, color: '#15803d', fontWeight: 600 }}>
          <Check size={18} /> Your review was submitted — thank you!
        </div>
      ) : (
        <button onClick={() => setShowForm((s) => !s)} className="btn btn-secondary btn-sm" style={{ marginBottom: 28 }}>
          {showForm ? 'Cancel' : '✏️ Write a Review'}
        </button>
      )}

      {/* Form */}
      {showForm && user && (
        <form onSubmit={handleSubmit} style={{ background: 'var(--gray-50)', borderRadius: 14, padding: 28, marginBottom: 36, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h3 style={{ fontWeight: 700, fontSize: 18 }}>Review {productName}</h3>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Your Rating *</p>
            <StarRow rating={rating} interactive onRate={setRating} />
            {errors.rating && <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{errors.rating}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Review Title *</label>
            <input className={`form-input${errors.title ? ' error' : ''}`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sum up your experience" maxLength={80} />
            {errors.title && <p className="form-error">{errors.title}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Your Review *</label>
            <textarea className={`form-input${errors.body ? ' error' : ''}`} value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Tell others what you think (min 20 chars)" style={{ resize: 'vertical' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              {errors.body ? <p className="form-error">{errors.body}</p> : <span />}
              <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{body.length}/500</span>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={submitting}>
            {submitting ? <><span className="spinner" /> Submitting…</> : 'Submit Review'}
          </button>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader size={28} strokeWidth={1.5} color="var(--gray-300)" style={{ animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {allReviews.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--gray-400)' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>💬</p>
              <p>No reviews yet — be the first!</p>
            </div>
          )}
          {allReviews.map((r) => (
            <div key={r.id} style={{ paddingBottom: 24, borderBottom: '1px solid var(--gray-100)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--black)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                    {r.userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {r.userName}
                      {r.verified && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#f0fdf4', color: '#16a34a', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 50 }}>
                          <Check size={9} strokeWidth={3} /> Verified Purchase
                        </span>
                      )}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>{r.date}</p>
                  </div>
                </div>
                <StarRow rating={r.rating} />
              </div>
              <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{r.title}</p>
              <p style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.7 }}>{r.body}</p>
              <button style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 12, color: 'var(--gray-400)' }}>
                <ThumbsUp size={13} /> Helpful
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
