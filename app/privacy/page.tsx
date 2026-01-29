import Link from 'next/link'
import Image from 'next/image'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="container mx-auto px-6 flex items-center justify-between h-20">
          <Link href="/" className="relative w-12 h-12"><Image src="/logo.png" alt="colour.page" fill className="object-contain" priority unoptimized /></Link>
          <Link href="/pro" className="h-10 px-5 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold text-sm rounded-lg flex items-center shadow-md">Pro</Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16 max-w-3xl">
        <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
        <div className="prose prose-invert prose-lg">
          <p className="text-gray-300 mb-6">Last updated: January 2025</p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Information We Collect</h2>
          <p className="text-gray-400 mb-4">We collect information you provide directly, including email addresses when you sign up for Pro, and images you upload for processing. Images are processed and stored temporarily to deliver our service.</p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. How We Use Your Information</h2>
          <p className="text-gray-400 mb-4">We use your information to provide our coloring page and dot-to-dot generation services, process payments, send you your generated content, and improve our services.</p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">3. Data Storage</h2>
          <p className="text-gray-400 mb-4">Your uploaded images and generated content are stored securely using Supabase. We retain generated images for 30 days to allow you to access your downloads.</p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. Third-Party Services</h2>
          <p className="text-gray-400 mb-4">We use Stripe for payment processing, Supabase for data storage, and Replicate for AI image processing. Each service has its own privacy policy.</p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Your Rights</h2>
          <p className="text-gray-400 mb-4">You can request deletion of your data at any time by contacting us. Pro subscribers can cancel their subscription at any time through Stripe.</p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">6. Contact</h2>
          <p className="text-gray-400 mb-4">For privacy questions, contact us at privacy@colour.page</p>
        </div>
      </main>

      <footer className="border-t border-zinc-800 py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-gray-400 text-sm">© 2025 colour.page</span>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
