import { useState } from 'react'
import { X } from 'lucide-react'

type Modal = 'help' | 'about' | null

const HELP_CONTENT = [
  { q: 'How do I track my order?',
    a: 'Sign in to your account and go to "Orders" in the user menu. You\'ll see the status of every order: Processing, Shipped, Delivered, or Cancelled.' },
  { q: 'What payment methods do you accept?',
    a: 'Currently we only accept Cash on Delivery (COD). Pay in cash when your order arrives — no extra fees, no upfront charges.' },
  { q: 'How long does delivery take?',
    a: 'Orders are typically delivered within 3–7 business days within the Philippines, depending on your location. You\'ll receive updates as the status changes.' },
  { q: 'Can I return or exchange a product?',
    a: 'Yes — you have 30 days from delivery to return unworn shoes in original packaging. Contact us to start a return.' },
  { q: 'How do I cancel an order?',
    a: 'If your order is still in "Processing" status, you can request cancellation by contacting support. Once shipped, cancellation is no longer available — use the return process instead.' },
  { q: 'Do you offer free shipping?',
    a: 'Yes — free shipping on orders over ₱75. Below that, a standard ₱9.99 shipping fee applies.' },
  { q: 'How do I save a delivery address?',
    a: 'During checkout, fill in the address form and check "Set as default address." It will be auto-selected on your next order.' },
  { q: 'Are my reviews public?',
    a: 'Yes. Product reviews are visible to all shoppers. If you have purchased the product, your review will display a "Verified Purchase" badge.' },
  { q: 'Is my data secure?',
    a: 'All authentication is handled by Supabase, an industry-standard secure platform. Passwords are hashed, and your session uses encrypted JWT tokens.' },
]

const ABOUT_CONTENT = {
  intro: 'This site is a Nike-inspired e-commerce platform built as a student capstone project to demonstrate a complete, real-world online store.',
  sections: [
    { title: 'About the Project', body: 'A fully functional storefront with user authentication, real-time inventory tracking, secure checkout, role-based admin controls, and an ACID-compliant Postgres database. Built with React, TypeScript, and Supabase.' },
    { title: 'Features',           body: 'Browse products by category, filter by price and size, manage a personal wishlist, leave verified reviews, save delivery addresses, track orders, and check out securely with Cash on Delivery.' },
    { title: 'Admin Capabilities', body: 'Staff users (super admin, manager, editor, viewer) can manage products with image uploads, view and update order statuses, manage user roles, and analyze sales data through interactive dashboards.' },
    { title: 'Technology Stack',   body: 'Frontend: React + TypeScript + Vite. Backend: Supabase (PostgreSQL + Auth + Storage + Realtime). Mobile-ready via Capacitor. Hosting on Vercel.' },
    { title: 'Disclaimer',         body: 'Nike® is a registered trademark of Nike, Inc. This project is a student demonstration of e-commerce techniques and is not affiliated with, endorsed by, or connected to Nike, Inc. All branding is used for educational purposes only.' },
  ],
}

export default function Footer() {
  const [modal, setModal] = useState<Modal>(null)

  return (
    <>
      <footer style={{ background: '#111', color: '#ccc', marginTop: 80 }}>
        <div className="container" style={{ padding: '40px 48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <svg viewBox="0 0 60 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 60, height: 24, flexShrink: 0 }}>
              <path d="M6 18L42.5 4C44.5 3.2 46 3.5 46 5.5C46 7.5 43 10.5 40 12L6 18Z" fill="white" />
            </svg>

            <div style={{ display: 'flex', gap: 32 }}>
              <button onClick={() => setModal('help')}
                style={{ fontSize: 14, color: '#ccc', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.15s' }}
                onMouseOver={(e) => ((e.target as HTMLButtonElement).style.color = '#fff')}
                onMouseOut={(e) => ((e.target as HTMLButtonElement).style.color = '#ccc')}>
                Help
              </button>
              <button onClick={() => setModal('about')}
                style={{ fontSize: 14, color: '#ccc', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.15s' }}
                onMouseOver={(e) => ((e.target as HTMLButtonElement).style.color = '#fff')}
                onMouseOut={(e) => ((e.target as HTMLButtonElement).style.color = '#ccc')}>
                About Nike
              </button>
            </div>

            <p style={{ fontSize: 12, color: '#888' }}>
              © {new Date().getFullYear()} Nike-inspired Demo Project · Educational use only
            </p>
          </div>
        </div>
      </footer>

      {modal === 'help' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>Help & FAQ</h2>
              <button onClick={() => setModal(null)} aria-label="Close"><X size={22} /></button>
            </div>
            <p style={{ color: 'var(--gray-500)', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
              Find answers to the most common questions about shopping with us. If you don't see your question below, please reach out.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {HELP_CONTENT.map((item, i) => (
                <details key={i} style={{ borderBottom: '1px solid var(--gray-100)', paddingBottom: 14 }}>
                  <summary style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: '6px 0', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {item.q}
                    <span style={{ color: 'var(--gray-400)', fontSize: 18 }}>+</span>
                  </summary>
                  <p style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.7, marginTop: 8, paddingLeft: 4 }}>{item.a}</p>
                </details>
              ))}
            </div>
            <div style={{ marginTop: 28, padding: 16, background: 'var(--gray-50)', borderRadius: 10, fontSize: 13, color: 'var(--gray-600)' }}>
              <strong style={{ color: 'var(--black)' }}>Still need help?</strong> Contact us at <a href="mailto:support@nikedemo.com" style={{ color: 'var(--black)', textDecoration: 'underline' }}>support@nikedemo.com</a>
            </div>
          </div>
        </div>
      )}

      {modal === 'about' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>About Nike</h2>
              <button onClick={() => setModal(null)} aria-label="Close"><X size={22} /></button>
            </div>
            <p style={{ fontSize: 15, color: 'var(--gray-700)', lineHeight: 1.7, marginBottom: 24 }}>{ABOUT_CONTENT.intro}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {ABOUT_CONTENT.sections.map((s, i) => (
                <div key={i}>
                  <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.7 }}>{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
