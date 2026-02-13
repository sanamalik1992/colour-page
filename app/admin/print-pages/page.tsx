'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Star,
  StarOff,
  Loader2,
  Plus,
  X,
  AlertTriangle,
  CheckCircle2,
  Shield,
} from 'lucide-react'
import { NavHeader } from '@/components/ui/nav-header'
import { PRINT_PAGE_CATEGORIES, SEASONS } from '@/types/photo-job'

const SEASON_LABELS: Record<string, string> = {
  ramadan: 'Ramadan', eid: 'Eid', christmas: 'Christmas', halloween: 'Halloween',
  easter: 'Easter', winter: 'Winter', spring: 'Spring', summer: 'Summer',
  autumn: 'Autumn', diwali: 'Diwali', 'new-year': 'New Year',
  valentines: "Valentine's", 'mothers-day': "Mother's Day", 'fathers-day': "Father's Day",
}

interface AdminPrintPage {
  id: string
  title: string
  slug: string
  category: string
  tags: string[]
  season?: string
  featured: boolean
  is_published: boolean
  download_count: number
  created_at: string
}

export default function AdminPrintPagesPage() {
  const [email, setEmail] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [pages, setPages] = useState<AdminPrintPage[]>([])
  const [loading, setLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadCategory, setUploadCategory] = useState<string>(PRINT_PAGE_CATEGORIES[0])
  const [uploadTags, setUploadTags] = useState('')
  const [uploadSeason, setUploadSeason] = useState('')
  const [uploadFeatured, setUploadFeatured] = useState(false)
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploading, setUploading] = useState(false)

  const loadPages = useCallback(async () => {
    if (!email) return
    setLoading(true)
    try {
      const res = await fetch(`/api/print-pages/admin?email=${encodeURIComponent(email)}`)
      if (res.status === 403) {
        setAuthenticated(false)
        setMessage({ type: 'error', text: 'Not authorized. Check your admin email.' })
        return
      }
      const data = await res.json()
      setPages(data.pages || [])
      setAuthenticated(true)
    } catch {
      setMessage({ type: 'error', text: 'Failed to load pages.' })
    } finally {
      setLoading(false)
    }
  }, [email])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    loadPages()
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile || !uploadTitle || !uploadCategory) return

    setUploading(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('email', email)
      formData.append('title', uploadTitle)
      formData.append('category', uploadCategory)
      formData.append('tags', uploadTags)
      formData.append('season', uploadSeason)
      formData.append('featured', String(uploadFeatured))
      formData.append('description', uploadDescription)

      const res = await fetch('/api/print-pages/admin', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }

      setMessage({ type: 'success', text: 'Page uploaded! It is saved as a draft.' })
      setShowUpload(false)
      resetUploadForm()
      loadPages()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  const resetUploadForm = () => {
    setUploadFile(null)
    setUploadTitle('')
    setUploadCategory(PRINT_PAGE_CATEGORIES[0])
    setUploadTags('')
    setUploadSeason('')
    setUploadFeatured(false)
    setUploadDescription('')
  }

  const togglePublish = async (pageId: string, published: boolean) => {
    try {
      const res = await fetch('/api/print-pages/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pageId, is_published: published }),
      })
      if (res.ok) loadPages()
    } catch {}
  }

  const toggleFeatured = async (pageId: string, featured: boolean) => {
    try {
      const res = await fetch('/api/print-pages/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pageId, featured }),
      })
      if (res.ok) loadPages()
    } catch {}
  }

  const deletePage = async (pageId: string) => {
    if (!confirm('Delete this page permanently?')) return
    try {
      await fetch('/api/print-pages/admin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pageId }),
      })
      loadPages()
    } catch {}
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
        <NavHeader />
        <div className="container mx-auto px-6 py-20">
          <div className="max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-6 justify-center">
              <Shield className="w-8 h-8 text-brand-primary" />
              <h1 className="text-2xl font-bold text-white">Admin Access</h1>
            </div>

            <form onSubmit={handleLogin} className="bg-zinc-800 rounded-xl p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">Admin Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@colour.page"
                  className="w-full h-11 px-4 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-brand-primary"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
              </button>
            </form>

            {message && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${
                message.type === 'error'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
              }`}>
                {message.text}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <NavHeader />

      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Print Pages Admin</h1>
            <p className="text-sm text-gray-400">{pages.length} pages total</p>
          </div>
          <button onClick={() => setShowUpload(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Upload Page
          </button>
        </div>

        {/* Messages */}
        {message && (
          <div className={`mb-6 p-3 rounded-lg text-sm flex items-center gap-2 ${
            message.type === 'error'
              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
              : 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        {/* Upload Modal */}
        {showUpload && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">Upload Print Page</h2>
                  <button onClick={() => { setShowUpload(false); resetUploadForm() }} className="text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* License Warning */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-6">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-300">
                      <strong>Licensing:</strong> Only upload artwork you created or have explicit license to
                      sell/distribute. Do not upload copyrighted characters, trademarked designs, or scraped content.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleUpload} className="space-y-4">
                  {/* File */}
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 block">Source Image (SVG/PNG)</label>
                    <input
                      type="file"
                      accept="image/*,.svg"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="w-full text-sm text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-primary file:text-white hover:file:bg-brand-border"
                      required
                    />
                  </div>

                  {/* Title */}
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 block">Title</label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g., Friendly Dragon"
                      className="w-full h-10 px-3 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-brand-primary"
                      required
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 block">Category</label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="w-full h-10 px-3 bg-zinc-700 border border-zinc-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-primary"
                    >
                      {PRINT_PAGE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 block">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={uploadTags}
                      onChange={(e) => setUploadTags(e.target.value)}
                      placeholder="e.g., dragon, fire, fantasy, kids"
                      className="w-full h-10 px-3 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-brand-primary"
                    />
                  </div>

                  {/* Season */}
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 block">Season / Event (optional)</label>
                    <select
                      value={uploadSeason}
                      onChange={(e) => setUploadSeason(e.target.value)}
                      className="w-full h-10 px-3 bg-zinc-700 border border-zinc-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-primary"
                    >
                      <option value="">None</option>
                      {SEASONS.map((s) => (
                        <option key={s} value={s}>{SEASON_LABELS[s] || s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 block">Description (optional)</label>
                    <textarea
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      placeholder="Brief description..."
                      rows={2}
                      className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-brand-primary resize-none"
                    />
                  </div>

                  {/* Featured */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={uploadFeatured}
                      onChange={(e) => setUploadFeatured(e.target.checked)}
                      className="w-4 h-4 text-brand-primary border-zinc-600 rounded focus:ring-brand-primary bg-zinc-700"
                    />
                    <span className="text-sm text-gray-300">Mark as Featured</span>
                  </label>

                  <button type="submit" disabled={uploading} className="btn-primary w-full">
                    {uploading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Uploading &amp; Generating PDF...</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Upload Page</>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Pages Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
          </div>
        ) : (
          <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700/50 text-left">
                    <th className="p-3 text-gray-400 font-medium">Title</th>
                    <th className="p-3 text-gray-400 font-medium">Category</th>
                    <th className="p-3 text-gray-400 font-medium">Season</th>
                    <th className="p-3 text-gray-400 font-medium text-center">Status</th>
                    <th className="p-3 text-gray-400 font-medium text-center">Featured</th>
                    <th className="p-3 text-gray-400 font-medium text-right">Downloads</th>
                    <th className="p-3 text-gray-400 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((page) => (
                    <tr key={page.id} className="border-b border-zinc-700/30 hover:bg-zinc-700/20 transition-colors">
                      <td className="p-3 text-white font-medium">{page.title}</td>
                      <td className="p-3 text-gray-400">{page.category}</td>
                      <td className="p-3 text-gray-400">{page.season ? (SEASON_LABELS[page.season] || page.season) : '—'}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          page.is_published
                            ? 'bg-brand-primary/20 text-brand-primary'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {page.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {page.featured ? (
                          <Star className="w-4 h-4 text-amber-400 mx-auto" />
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-400 text-right">{page.download_count}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => togglePublish(page.id, !page.is_published)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-zinc-600 hover:text-white transition-colors"
                            title={page.is_published ? 'Unpublish' : 'Publish'}
                          >
                            {page.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => toggleFeatured(page.id, !page.featured)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-zinc-600 hover:text-amber-400 transition-colors"
                            title={page.featured ? 'Unfeature' : 'Feature'}
                          >
                            {page.featured ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => deletePage(page.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
