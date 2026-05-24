import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapPin, Plus, Trash2, Check, ChevronRight, Loader } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useAddresses } from '../lib/hooks'
import { saveAddress, removeAddress, setDefaultAddress, placeOrder } from '../lib/api'
import type { DeliveryAddress } from '../types'

type Step = 'address' | 'payment' | 'confirm'

function AddressForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const { user } = useStore()
  const [form, setForm] = useState({
    label: 'Home', fullName: '', phone: '', line1: '', line2: '',
    city: '', province: '', zip: '', country: 'Philippines', isDefault: true,
  })
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [saving, setSaving] = useState(false)

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  const validate = () => {
    const e: Record<string,string> = {}
    if (!form.fullName.trim()) e.fullName = 'Full name required'
    if (!form.phone.trim()) e.phone = 'Phone required'
    if (!form.line1.trim()) e.line1 = 'Address required'
    if (!form.city.trim()) e.city = 'City required'
    if (!form.province.trim()) e.province = 'Province required'
    if (!form.zip.trim()) e.zip = 'ZIP required'
    setErrors(e); return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !user) return
    setSaving(true)
    try { await saveAddress(user.id, form); onSave() }
    catch (err: any) { setErrors({ fullName: err.message }) }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--gray-50)', borderRadius: 14, padding: 24, marginBottom: 20 }}>
      <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>New Delivery Address</h3>
      <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 20 }}>This will be saved for next time, so you don't have to enter it again.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Label</label>
          <select className="form-input" value={form.label} onChange={setField('label')}>
            {['Home','Office','Other'].map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div />
        {[
          { k: 'fullName', label: 'Full Name *', ph: 'Juan dela Cruz', col: '1/-1' },
          { k: 'phone', label: 'Phone *', ph: '+63 917 000 0000', col: '1' },
          { k: 'line1', label: 'Address Line 1 *', ph: '123 Rizal Street', col: '1/-1' },
          { k: 'line2', label: 'Address Line 2', ph: 'Apt, unit (optional)', col: '1/-1' },
          { k: 'city', label: 'City *', ph: 'Cagayan de Oro', col: '1' },
          { k: 'province', label: 'Province *', ph: 'Misamis Oriental', col: '1' },
          { k: 'zip', label: 'ZIP *', ph: '9000', col: '1' },
          { k: 'country', label: 'Country', ph: '', col: '1' },
        ].map(({ k, label, ph, col }) => (
          <div key={k} className="form-group" style={{ gridColumn: col }}>
            <label className="form-label">{label}</label>
            <input className={`form-input${errors[k] ? ' error' : ''}`} value={(form as any)[k]} onChange={setField(k as any)} placeholder={ph} />
            {errors[k] && <p className="form-error">{errors[k]}</p>}
          </div>
        ))}
        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
            <input type="checkbox" checked={form.isDefault} onChange={setField('isDefault')} style={{ width: 16, height: 16 }} />
            Set as default address (auto-select for future orders)
          </label>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary btn-sm">Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? <><span className="spinner" /> Saving…</> : 'Save Address'}
        </button>
      </div>
    </form>
  )
}

export default function Checkout() {
  const { user, cart, getCartTotal, clearCart, addToast } = useStore()
  const navigate = useNavigate()
  const { data: addresses, loading: addrLoading, refetch: refetchAddr } = useAddresses(user?.id)

  const [step, setStep] = useState<Step>('address')
  const [selectedAddr, setSelectedAddr] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const payMethod = 'cod' as const
  const [placing, setPlacing] = useState(false)

  const total = getCartTotal()
  const shipping = total >= 75 ? 0 : 9.99
  const tax = total * 0.08
  const orderTotal = total + shipping + tax

  // Auto-select default address when addresses load (REMEMBERS user's address)
  useEffect(() => {
    if (addresses && !selectedAddr) {
      const defaultAddr = addresses.find((a) => a.isDefault)
      if (defaultAddr) {
        setSelectedAddr(defaultAddr.id)
        // Skip address step if we have a default — go straight to payment
        addToast(`Using saved address: ${defaultAddr.label}`, 'info')
      } else if (addresses[0]) {
        setSelectedAddr(addresses[0].id)
      } else {
        setShowForm(true)
      }
    }
  }, [addresses, selectedAddr, addToast])

  if (!user) return (
    <div style={{ paddingTop: 'var(--nav-h)', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <h2>Please sign in to checkout</h2>
      <Link to="/login" className="btn btn-primary">Sign In</Link>
    </div>
  )
  if (cart.length === 0) return (
    <div style={{ paddingTop: 'var(--nav-h)', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <h2>Your bag is empty</h2>
      <Link to="/products" className="btn btn-primary">Shop Now</Link>
    </div>
  )

  const handlePlaceOrder = async () => {
    if (!selectedAddr) { addToast('Please select a delivery address', 'error'); return }
    setPlacing(true)
    try {
      const orderId = await placeOrder({
        userId: user.id, addressId: selectedAddr, cart, paymentMethod: payMethod,
        subtotal: total, shipping, tax, total: orderTotal,
      })
      clearCart()
      addToast(`🎉 Order ${orderId} placed successfully!`, 'success')
      navigate('/orders')
    } catch (err: any) {
      addToast(err.message || 'Failed to place order', 'error')
    } finally { setPlacing(false) }
  }

  const STEPS: Step[] = ['address','payment','confirm']
  const stepLabels: Record<Step,string> = { address: 'Delivery', payment: 'Payment', confirm: 'Review' }
  const selectedAddress = (addresses ?? []).find((a) => a.id === selectedAddr)

  return (
    <div style={{ paddingTop: 'var(--nav-h)', background: 'var(--gray-50)', minHeight: '100vh' }}>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', maxWidth: 420, marginBottom: 36 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: STEPS.indexOf(s) < STEPS.indexOf(step) ? 'pointer' : 'default' }}
                onClick={() => STEPS.indexOf(s) < STEPS.indexOf(step) && setStep(s)}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13,
                  background: s === step ? 'var(--black)' : STEPS.indexOf(s) < STEPS.indexOf(step) ? '#22c55e' : 'var(--gray-200)',
                  color: s === step || STEPS.indexOf(s) < STEPS.indexOf(step) ? 'var(--white)' : 'var(--gray-500)' }}>
                  {STEPS.indexOf(s) < STEPS.indexOf(step) ? <Check size={15} strokeWidth={3} /> : i + 1}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: s === step ? 'var(--black)' : 'var(--gray-400)', whiteSpace: 'nowrap' }}>{stepLabels[s]}</span>
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: STEPS.indexOf(s) < STEPS.indexOf(step) ? '#22c55e' : 'var(--gray-200)', margin: '0 8px', marginBottom: 20 }} />}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 28, alignItems: 'start' }}>
          <div>
            {/* STEP 1 — Delivery */}
            {step === 'address' && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 8 }}>Delivery Address</h2>
                {selectedAddress && !showForm && (
                  <p style={{ fontSize: 13, color: '#16a34a', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check size={14} /> We've pre-selected your default address
                  </p>
                )}
                {showForm && <AddressForm onSave={() => { setShowForm(false); refetchAddr() }} onCancel={() => setShowForm(false)} />}

                {addrLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <Loader size={24} strokeWidth={1.5} color="var(--gray-300)" style={{ animation: 'spin 0.8s linear infinite' }} />
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                  </div>
                ) : (addresses ?? []).map((addr: DeliveryAddress) => (
                  <div key={addr.id} onClick={() => setSelectedAddr(addr.id)}
                    style={{ padding: 20, background: 'var(--white)', borderRadius: 12, border: `2px solid ${selectedAddr === addr.id ? 'var(--black)' : 'var(--gray-200)'}`, marginBottom: 12, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 14, flex: 1 }}>
                      <div style={{ marginTop: 2, color: selectedAddr === addr.id ? 'var(--black)' : 'var(--gray-400)' }}>
                        {selectedAddr === addr.id ? <Check size={18} strokeWidth={3} /> : <MapPin size={18} />}
                      </div>
                      <div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' }}>
                          <strong style={{ fontSize: 14 }}>{addr.label}</strong>
                          {addr.isDefault && <span style={{ fontSize: 10, background: 'var(--black)', color: 'var(--white)', padding: '2px 7px', borderRadius: 50, fontWeight: 700 }}>DEFAULT</span>}
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--gray-700)', lineHeight: 1.5 }}>
                          {addr.fullName}<br />
                          {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
                          {addr.city}, {addr.province} {addr.zip}<br />
                          {addr.country} · {addr.phone}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {!addr.isDefault && (
                        <button onClick={async (e) => { e.stopPropagation(); await setDefaultAddress(user.id, addr.id); refetchAddr() }}
                          style={{ fontSize: 11, color: 'var(--gray-500)', border: '1px solid var(--gray-200)', borderRadius: 6, padding: '4px 8px' }}>
                          Set default
                        </button>
                      )}
                      <button onClick={async (e) => { e.stopPropagation(); await removeAddress(addr.id); if (selectedAddr === addr.id) setSelectedAddr(null); refetchAddr() }}
                        style={{ color: 'var(--red)', padding: 4 }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}

                {!showForm && (
                  <button onClick={() => setShowForm(true)} className="btn btn-secondary btn-sm" style={{ marginBottom: 24 }}>
                    <Plus size={15} /> Add New Address
                  </button>
                )}
                <button className="btn btn-primary" disabled={!selectedAddr} onClick={() => setStep('payment')} style={{ opacity: !selectedAddr ? 0.5 : 1 }}>
                  Continue to Payment <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* STEP 2 — Payment */}
            {step === 'payment' && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 8 }}>Payment Method</h2>
                <p style={{ fontSize: 14, color: 'var(--gray-500)', marginBottom: 24 }}>Choose how you'd like to pay for your order.</p>
                <label style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 20, background: 'var(--white)', borderRadius: 12, border: '2px solid var(--black)', cursor: 'pointer', marginBottom: 16 }}>
                  <input type="radio" name="pay" checked readOnly style={{ width: 18, height: 18 }} />
                  <span style={{ fontSize: 24 }}>💵</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>Cash on Delivery</p>
                    <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>Pay in cash when your order arrives</p>
                  </div>
                </label>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 18px', fontSize: 14, color: '#15803d', marginBottom: 24, lineHeight: 1.5 }}>
                  💵 <strong>Pay in cash when your order is delivered.</strong><br/>
                  <span style={{ fontSize: 13, color: '#166534' }}>No extra charges. Please prepare the exact amount or small bills.</span>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setStep('address')} className="btn btn-secondary">← Back</button>
                  <button onClick={() => setStep('confirm')} className="btn btn-primary">
                    Review Order <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — Review */}
            {step === 'confirm' && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 20 }}>Review Your Order</h2>
                <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--gray-200)', overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between' }}>
                    <strong>Items ({cart.length})</strong>
                    <button onClick={() => navigate('/cart')} style={{ fontSize: 13, color: 'var(--gray-500)', textDecoration: 'underline' }}>Edit bag</button>
                  </div>
                  {cart.map((item) => (
                    <div key={item.key} style={{ display: 'flex', gap: 14, padding: '14px 20px', borderBottom: '1px solid var(--gray-100)', alignItems: 'center' }}>
                      <img src={item.product.image} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', background: 'var(--gray-100)', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, fontSize: 14 }}>{item.product.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--gray-500)' }}>US {item.size} · Qty {item.qty}</p>
                      </div>
                      <strong>₱{((item.product.sale_price ?? item.product.price) * item.qty).toFixed(2)}</strong>
                    </div>
                  ))}
                </div>

                {selectedAddress && (
                  <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--gray-200)', padding: '16px 20px', marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <strong style={{ fontSize: 14 }}>Deliver to</strong>
                      <button onClick={() => setStep('address')} style={{ fontSize: 13, color: 'var(--gray-500)', textDecoration: 'underline' }}>Change</button>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.6 }}>
                      {selectedAddress.fullName} · {selectedAddress.phone}<br />
                      {selectedAddress.line1}, {selectedAddress.city}, {selectedAddress.province} {selectedAddress.zip}
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setStep('payment')} className="btn btn-secondary">← Back</button>
                  <button onClick={handlePlaceOrder} className="btn btn-primary" style={{ flex: 1 }} disabled={placing}>
                    {placing ? <><span className="spinner" /> Placing Order…</> : `Place Order · ₱${orderTotal.toFixed(2)}`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ background: 'var(--white)', borderRadius: 16, padding: 24, border: '1px solid var(--gray-200)', position: 'sticky', top: 'calc(var(--nav-h) + 20px)' }}>
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 18 }}>Order Summary</h3>
            {cart.slice(0, 3).map((item) => (
              <div key={item.key} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
                <img src={item.product.image} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', background: 'var(--gray-100)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--gray-500)' }}>×{item.qty} · US {item.size}</p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700 }}>₱{((item.product.sale_price ?? item.product.price) * item.qty).toFixed(2)}</span>
              </div>
            ))}
            {cart.length > 3 && <p style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 12 }}>+ {cart.length - 3} more</p>}
            <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>Subtotal</span><span>₱{total.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>Shipping</span><span style={{ color: shipping === 0 ? '#22c55e' : undefined }}>{shipping === 0 ? 'Free' : `₱${shipping.toFixed(2)}`}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>Tax (8%)</span><span>₱{tax.toFixed(2)}</span></div>
              <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18 }}>
                <span>Total</span><span>₱{orderTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
