import Link from 'next/link'
import { CheckCircle2, FolderHeart, ImagePlus, Sparkles } from 'lucide-react'
import { NavHeader } from '@/components/ui/nav-header'
import { PageFooter } from '@/components/ui/page-footer'

export default async function ResultPage({
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ payment?: string }>
}) {
  const { payment } = await searchParams
  const paid = payment === 'success'

  return (
    <div className="min-h-screen app-bg">
      <NavHeader isPro={paid} />

      <main className="container mx-auto px-6 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-brand-primary/15 rounded-full flex items-center justify-center mx-auto mb-6">
            {paid ? (
              <CheckCircle2 className="w-10 h-10 text-brand-primary" />
            ) : (
              <Sparkles className="w-10 h-10 text-brand-primary" />
            )}
          </div>

          <h1 className="text-3xl font-bold text-white mb-3">
            {paid ? 'Payment successful — thank you!' : 'You’re all set'}
          </h1>
          <p className="text-gray-400 mb-8">
            {paid
              ? 'Your purchase is complete. Your colouring pages are saved in My Pages, ready to download and print without a watermark.'
              : 'Your colouring pages are saved in My Pages, ready to download and print.'}
          </p>

          <div className="space-y-3">
            <Link href="/library" className="btn-primary w-full">
              <FolderHeart className="w-5 h-5" />
              Go to My Pages
            </Link>
            <Link href="/" className="btn-outline w-full">
              <ImagePlus className="w-4 h-4" />
              Create Another Page
            </Link>
          </div>
        </div>
      </main>

      <PageFooter />
    </div>
  )
}
