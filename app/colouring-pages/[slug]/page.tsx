import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Download, Printer, ArrowLeft } from 'lucide-react'

interface PageData {
  id: string
  title: string
  slug: string
  description: string
  category: string
  tags: string[]
  preview_url: string
  download_count: number
  created_at: string
}

interface RelatedPage {
  id: string
  title: string
  slug: string
  preview_url: string
  category: string
}

async function getPage(slug: string): Promise<{ page: PageData; related: RelatedPage[] } | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://colour.page'
  try {
    const res = await fetch(`${baseUrl}/api/colouring-pages/${slug}`, {
      next: { revalidate: 3600 }
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const data = await getPage(slug)
  
  if (!data) {
    return { title: 'Colouring Page Not Found' }
  }

  const { page } = data

  return {
    title: `${page.title} | Free Printable Colouring Page`,
    description: page.description || `Download and print this free ${page.title.toLowerCase()} for kids.`,
    keywords: [page.title, 'colouring page', 'printable', 'free', 'kids', ...(page.tags || [])],
    openGraph: {
      title: page.title,
      description: page.description,
      images: page.preview_url ? [page.preview_url] : [],
      type: 'article'
    },
    alternates: {
      canonical: `https://colour.page/colouring-pages/${slug}`
    }
  }
}

export default async function ColouringPageDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getPage(slug)

  if (!data) {
    notFound()
  }

  const { page, related } = data

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: page.title,
    description: page.description,
    contentUrl: page.preview_url,
    datePublished: page.created_at,
    author: { '@type': 'Organization', name: 'colour.page' }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
        <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
          <div className="container mx-auto px-6 flex items-center justify-between h-16">
            <Link href="/" className="relative w-10 h-10">
              <Image src="/logo.png" alt="colour.page" fill className="object-contain" />
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/print" className="text-sm font-medium text-gray-400 hover:text-white">All Pages</Link>
              <Link href="/pro" className="h-9 px-4 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold text-sm rounded-lg flex items-center">Pro</Link>
            </nav>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <nav className="flex items-center gap-2 text-sm mb-6">
            <Link href="/" className="text-gray-500 hover:text-white">Home</Link>
            <span className="text-gray-600">/</span>
            <Link href="/print" className="text-gray-500 hover:text-white">Colouring Pages</Link>
            <span className="text-gray-600">/</span>
            <span className="text-gray-400">{page.category}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-4 shadow-xl">
              {page.preview_url && (
                <Image 
                  src={page.preview_url} 
                  alt={page.title}
                  width={800}
                  height={1000}
                  className="w-full rounded-lg"
                  unoptimized
                />
              )}
            </div>

            <div>
              <div className="mb-2">
                <span className="inline-block px-3 py-1 bg-brand-primary/20 text-brand-primary text-sm font-medium rounded-full">
                  {page.category}
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{page.title}</h1>
              <p className="text-gray-400 mb-6">{page.description}</p>

              <div className="flex items-center gap-6 mb-8 text-sm text-gray-500">
                <span>{page.download_count?.toLocaleString() || 0} downloads</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <a 
                  href={page.preview_url}
                  download={`${page.slug}.png`}
                  className="flex-1 h-14 bg-brand-primary hover:bg-brand-border text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download PNG
                </a>
                <button className="flex-1 h-14 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                  <Printer className="w-5 h-5" />
                  Print
                </button>
              </div>

              {page.tags && page.tags.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {page.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-zinc-800 text-gray-300 text-sm rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              <Link href="/print" className="inline-flex items-center gap-2 text-brand-primary hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to all colouring pages
              </Link>
            </div>
          </div>

          {related && related.length > 0 && (
            <section className="mt-16">
              <h2 className="text-2xl font-bold text-white mb-6">More {page.category} Colouring Pages</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {related.map((r: RelatedPage) => (
                  <Link 
                    key={r.id} 
                    href={`/colouring-pages/${r.slug}`}
                    className="group bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1"
                  >
                    <div className="aspect-[3/4] relative bg-gray-100">
                      {r.preview_url && (
                        <Image src={r.preview_url} alt={r.title} fill className="object-contain p-2" unoptimized />
                      )}
                    </div>
                    <div className="p-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{r.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>

        <footer className="border-t border-zinc-800 py-8 mt-16">
          <div className="container mx-auto px-6 text-center text-gray-500 text-sm">
            © 2025 colour.page - Free Printable Colouring Pages
          </div>
        </footer>
      </div>
    </>
  )
}
