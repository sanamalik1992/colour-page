import { NavHeader } from '@/components/ui/nav-header'
import { PageFooter } from '@/components/ui/page-footer'

const CONTACT = 'colour.page123@gmail.com'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-2xl font-semibold text-white mt-8 mb-4">{title}</h2>
      <div className="text-gray-400 space-y-4">{children}</div>
    </section>
  )
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen app-bg">
      <NavHeader />

      <main className="container mx-auto px-6 py-16 max-w-3xl">
        <h1 className="text-4xl font-bold text-white mb-8">Cookie Policy</h1>
        <div className="prose prose-invert prose-lg max-w-none">
          <p className="text-gray-300 mb-6">Last updated: July 2026</p>

          <Section title="What cookies are">
            <p>Cookies (and similar technologies like your browser&rsquo;s local storage) are small pieces of data a website stores on your device. We keep our use of them to a minimum and don&rsquo;t use cookies to build advertising profiles or sell your data.</p>
          </Section>

          <Section title="What we use">
            <p><strong className="text-white">Strictly necessary</strong> — these keep the core site working and can&rsquo;t be switched off:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong className="text-white">Sign-in session</strong> (set by our authentication provider, Supabase) — keeps you logged in and your library available.</li>
              <li><strong className="text-white">Secure checkout</strong> (set by Stripe) — needed to take payment safely and prevent fraud when you subscribe or place an order.</li>
              <li><strong className="text-white">Preferences</strong> — small items we store locally, such as remembering that you&rsquo;ve seen this cookie notice.</li>
            </ul>
            <p><strong className="text-white">Analytics</strong> — we use privacy-friendly, aggregate analytics (a live &ldquo;how many people are on the site&rdquo; count and Vercel Analytics) to understand how the site is used. These do not identify you and are not used for advertising.</p>
          </Section>

          <Section title="Managing cookies">
            <p>You can delete or block cookies through your browser settings. Blocking strictly-necessary cookies will stop you from signing in or checking out. For more on managing cookies, see your browser&rsquo;s help pages or <a href="https://www.aboutcookies.org" className="text-brand-primary hover:underline">aboutcookies.org</a>.</p>
          </Section>

          <Section title="More information">
            <p>How we handle your personal data is set out in our <a href="/privacy" className="text-brand-primary hover:underline">Privacy Policy</a>. Any questions? Email us at <a href={`mailto:${CONTACT}`} className="text-brand-primary hover:underline">{CONTACT}</a>.</p>
          </Section>
        </div>
      </main>

      <PageFooter />
    </div>
  )
}
