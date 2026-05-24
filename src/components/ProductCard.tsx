import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { Product } from '../types'
import './ProductCard.css'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const { toggleWishlist, isWishlisted, addToCart } = useStore()
  const [hovered, setHovered] = useState(false)
  const wishlisted = isWishlisted(product.id)
  const price = product.sale_price ?? product.price

  return (
    <div
      className="product-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="card-image-wrap">
        <Link to={`/products/${product.id}`}>
          <img src={product.image} alt={product.name} className="card-img" loading="lazy" />
        </Link>

        <button
          className={`card-wish${wishlisted ? ' active' : ''}`}
          onClick={() => toggleWishlist(product)}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart size={18} fill={wishlisted ? 'currentColor' : 'none'} />
        </button>

        {hovered && product.stock > 0 && (
          <button
            className="card-quick-add btn btn-primary btn-sm"
            onClick={() => addToCart(product, product.sizes[0])}
          >
            Quick Add
          </button>
        )}
      </div>

      <div className="card-info">
        <Link to={`/products/${product.id}`} className="card-name">
          {product.name}
        </Link>
        <span className="card-cat">{product.category}</span>
        <div className="card-price">
          <span className={product.sale_price ? 'sale' : ''}>₱{price}</span>
          {product.sale_price && (
            <span className="original">₱{product.price}</span>
          )}
        </div>
        <div className="card-colors">
          {product.colors.slice(0, 4).map((c, i) => (
            <span key={i} className="color-dot" style={{ background: c }} />
          ))}
          {product.colors.length > 4 && (
            <span className="color-more">+{product.colors.length - 4}</span>
          )}
        </div>
      </div>
    </div>
  )
}
