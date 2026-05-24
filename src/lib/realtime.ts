import { useEffect } from 'react'
import { supabase } from './supabase'

// Subscribe to real-time product stock changes
// Call in the Products page or a top-level provider
export function useRealtimeProducts(onUpdate: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel('products-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => { onUpdate() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [onUpdate])
}

// Subscribe to real-time order status changes (for admin)
export function useRealtimeOrders(onUpdate: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => { onUpdate() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [onUpdate])
}
