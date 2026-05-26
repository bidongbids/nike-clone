import { Link } from 'react-router-dom'
import { ArrowRight, ChevronRight, Loader } from 'lucide-react'
import { useProducts } from '../lib/hooks'
import { useRealtimeProducts } from '../lib/realtime'
import ProductCard from '../components/ProductCard'
import './Home.css'

export default function Home() {
  const { data: products, loading, refetch } = useProducts()
  useRealtimeProducts(refetch)  // live stock updates

  const featured = (products ?? []).filter((p) => p.badge === 'new').slice(0, 4)
  const trending = (products ?? []).slice(0, 8).slice(4)
  const fallback = (products ?? []).slice(0, 4)

  return (
    <div className="home">
      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <span className="hero-eyebrow">New Arrival</span>
          <h1 className="hero-title">DONT DO<br />IT.</h1>
          <p className="hero-sub">The latest Air Max innovation is here. Built for the streets, designed for your life.</p>
          <div className="hero-ctas">
            <Link to="/products" className="btn btn-primary">Shop Now <ArrowRight size={16} /></Link>
            <Link to="/products?cat=new" className="btn btn-secondary">New Arrivals</Link>
          </div>
        </div>
        <div className="hero-image">
          <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=85" alt="Featured Shoe" />
        </div>
      </section>

      {/* Category strip */}
      <section className="cat-strip container">
        {[
          { label: 'Men',        emoji: '👔', to: '/products?cat=men',        bg: '#f3f3f3', fg: '#111' },
          { label: 'Women',      emoji: '👗', to: '/products?cat=women',      bg: '#fce7f3', fg: '#111' },
          { label: 'Basketball', emoji: '🏀', to: '/products?cat=basketball', bg: '#111',    fg: '#fff' },
          { label: 'Lifestyle',  emoji: '✨', to: '/products?cat=lifestyle',  bg: '#e5ff00', fg: '#111' },
          { label: 'Sale',       emoji: '🔥', to: '/products?cat=sale',       bg: '#f04048', fg: '#fff' },
        ].map((c) => (
          <Link key={c.label} to={c.to} className="cat-chip" style={{ background: c.bg, color: c.fg }}>
            <span>{c.emoji}</span> {c.label} <ChevronRight size={14} />
          </Link>
        ))}
      </section>

      {/* Featured */}
      <section className="section container">
        <div className="section-header">
          <h2 className="section-title">Featured</h2>
          <Link to="/products?cat=new" className="see-all">Shop New <ArrowRight size={14} /></Link>
        </div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Loader size={28} strokeWidth={1.5} color="var(--gray-300)" style={{ animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <div className="product-grid">
            {(featured.length ? featured : fallback).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* Mid banner */}
      <section className="mid-banner">
        <div className="mid-banner-content container">
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(48px,6vw,96px)', lineHeight: 0.9, color: 'var(--white)' }}>STEP UP<br />YOUR GAME.</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', margin: '20px 0 28px', maxWidth: 400 }}>New men's & women's collections, built for every move.</p>
            <Link to="/products?cat=men" className="btn btn-accent">Shop Men <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      {/* Trending */}
      <section className="section container">
        <div className="section-header">
          <h2 className="section-title">Trending Now</h2>
          <Link to="/products" className="see-all">See All <ArrowRight size={14} /></Link>
        </div>
        <div className="product-grid">
          {(trending.length ? trending : (products ?? []).slice(4, 8)).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Promo blocks */}
      <section className="promo-blocks container">
        <div className="promo-block promo-dark">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 56, lineHeight: 1, color: 'var(--white)' }}>MEMBER<br />EXCLUSIVE</h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>Sign in to unlock member pricing and early access.</p>
          <Link to="/login" className="btn btn-accent btn-sm">Join Now</Link>
        </div>
        <div className="promo-block promo-light">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 56, lineHeight: 1 }}>SALE<br />UP TO 40%</h3>
          <p style={{ color: 'var(--gray-600)', marginBottom: 20 }}>Don't miss out. Limited time offers.</p>
          <Link to="/products?cat=sale" className="btn btn-primary btn-sm">Shop Sale</Link>
        </div>
      </section>
    </div>
  )
}
