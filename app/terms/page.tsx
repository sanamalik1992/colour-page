import Link from 'next/link'
import Image from 'next/image'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="container mx-auto px-6 flex items-center justify-between h-20">
          <Link href="/" className="relative w-12 h-12"><Image src="/logo.png" alt="colour.page" fill className="object-contain" priority unoptimized /></Link>
          <Link href="/pro" className="h-10 px-5 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold text-sm rounded-lg flex items-center shadow-md">Pro</Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16 max-w-3xl">
        <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>
        <div className="prose prose-invert prose-lg">
          <p className="text-gray-300 mb-6">Last updated: January 2025</p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-400 mb-4">By using colour.page, you agree to these terms. If you disagree, please do not use our service.</p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. Service Description</h2>
          <p className="text-gray-400 mb-4">colour.page provides AI-powered tools to convert photos into coloring pages and dot-to-dot puzzles. Free users receive limited generations per month. Pro subscribers receive unlimited access.</p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">3. User Responsibilities</h2>
          <p className="text-gray-400 mb-4">You agree to only upload images you have the right to use. You will not upload illegal, harmful, or inappropriate content. You are responsible for how you use generated content.</p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. Intellectual Property</h2>
          <p className="text-gray-400 mb-4">You retain rights to images you upload. Generated coloring pages and dot-to-dot puzzles are yours to use for personal purposes. Pro Annual subscribers may use generated content commercially.</p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Subscriptions & Payments</h2>
          <p className="text-gray-400 mb-4">Pro subscriptions are billed monthly or annually through Stripe. You can cancel anytime. Refunds are provided at our discretion within 7 days of purchase.</p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">6. Limitation of Liability</h2>
          <p className="text-gray-400 mb-4">colour.page is provided as-is. We are not liable for any damages arising from use of our service. Our liability is limited to the amount you paid us.</p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">7. Changes to Terms</h2>
          <p className="text-gray-400 mb-4">We may update these terms. Continued use after changes constitutes acceptance.</p>
        </div>
      </main>

      <footer className="border-t border-zinc-800 py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-gray-400 text-sm">© 2025 colour.page</span>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="text-white">Terms</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
