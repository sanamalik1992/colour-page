import { NavHeader } from '@/components/ui/nav-header'
import { PageFooter } from '@/components/ui/page-footer'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen app-bg">
      <NavHeader />

      <main className="container mx-auto px-6 py-16 max-w-3xl">
        <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
        <div className="prose prose-invert prose-lg">
          <p className="text-gray-300 mb-6">Last updated: July 2026</p>

          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Information We Collect</h2>
          <p className="text-gray-400 mb-4">We collect information you provide directly, including email addresses when you sign up for Pro, and images you upload for processing. Images are processed and stored temporarily to deliver our service.</p>

          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. How We Use Your Information</h2>
          <p className="text-gray-400 mb-4">We use your information to provide our colouring page and dot-to-dot generation services, process payments, send you your generated content, and improve our services.</p>

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

      <PageFooter />
    </div>
  )
}
