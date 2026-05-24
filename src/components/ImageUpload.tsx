import { useState, useRef } from 'react'
import { Upload, X, Loader, ImageIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface ImageUploadProps {
  value: string          // current image URL
  onChange: (url: string) => void
  bucket?: string        // Supabase storage bucket name
}

export default function ImageUpload({
  value,
  onChange,
  bucket = 'product-images',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = async (file: File) => {
    // Validate type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, WebP)')
      return
    }
    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB')
      return
    }

    setError('')
    setUploading(true)

    try {
      // Unique filename to avoid collisions
      const ext = file.name.split('.').pop()
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage.from(bucket).getPublicUrl(filename)
      onChange(data.publicUrl)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      // If bucket doesn't exist, show helpful message
      if (msg.includes('Bucket not found') || msg.includes('bucket')) {
        setError('Storage not set up yet — see instructions below')
      } else {
        setError(msg)
      }
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  const handleRemove = () => {
    onChange('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      {value ? (
        /* Preview */
        <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: 'var(--gray-100)', aspectRatio: '16/9', maxHeight: 200 }}>
          <img
            src={value}
            alt="Product preview"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setError('Could not load image — check the URL or re-upload')}
          />
          <button
            type="button"
            onClick={handleRemove}
            style={{
              position: 'absolute', top: 8, right: 8,
              background: 'rgba(0,0,0,0.6)', color: '#fff',
              borderRadius: '50%', width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
          <div style={{ position: 'absolute', bottom: 8, left: 8 }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={{
                background: 'rgba(0,0,0,0.6)', color: '#fff',
                padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Upload size={12} /> Replace
            </button>
          </div>
        </div>
      ) : (
        /* Drop zone */
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? 'var(--black)' : 'var(--gray-300)'}`,
            borderRadius: 10,
            padding: '32px 20px',
            textAlign: 'center',
            cursor: uploading ? 'wait' : 'pointer',
            background: dragOver ? 'var(--gray-50)' : 'var(--white)',
            transition: 'all 0.15s',
          }}
        >
          {uploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <Loader size={28} color="var(--gray-400)" style={{ animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Uploading image…</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ background: 'var(--gray-100)', borderRadius: '50%', padding: 14 }}>
                <ImageIcon size={24} color="var(--gray-400)" />
              </div>
              <p style={{ fontWeight: 600, fontSize: 14 }}>
                {dragOver ? 'Drop to upload' : 'Click or drag image here'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>JPG, PNG, WebP · Max 5MB</p>
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--red)', background: '#fef2f2', padding: '8px 12px', borderRadius: 6 }}>
          {error}
          {error.includes('Storage not set up') && (
            <div style={{ marginTop: 6, color: 'var(--gray-600)', lineHeight: 1.5 }}>
              Go to <strong>Supabase → Storage → New Bucket</strong>, name it <code style={{ background: '#fee2e2', padding: '1px 5px', borderRadius: 3 }}>product-images</code>, check <strong>Public bucket</strong>, then try again.
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
