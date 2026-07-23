import { NavHeader } from '@/components/ui/nav-header'
import { PageFooter } from '@/components/ui/page-footer'

export const metadata = { title: 'Privacy Policy · colour.page' }

const CONTACT = 'colour.page123@gmail.com'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen app-bg">
      <NavHeader />

      <main className="container mx-auto px-6 py-16 max-w-3xl text-gray-300">
        <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: July 2026</p>

        <p className="mb-4">
          colour.page is operated by <strong className="text-white">Ozeco Ltd</strong>, a company registered in England
          and Wales (company number 15445991), registered office: <strong className="text-white">Unit A James Carter
          Road, Mildenhall, Bury St. Edmunds, England, IP28 7DE</strong>.
        </p>
        <p className="mb-4">Ozeco Ltd is the &ldquo;data controller&rdquo; for the personal information described in this policy.</p>
        <p className="mb-4">
          We know you&rsquo;re trusting us with something precious — often photographs of your children. This policy
          explains, in plain English, what we collect, why, who we share it with, and how you can get it deleted.
        </p>
        <p className="mb-8"><strong className="text-white">Contact:</strong> <a href={`mailto:${CONTACT}`} className="text-brand-primary hover:underline">{CONTACT}</a></p>

        <Section title="1. Photos of children — the important bit">
          <p className="mb-4">
            Many people use colour.page to turn a family photo into a colouring page. Because those photos often show
            children, we want to be completely clear about what happens to them.
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-4">
            <li><strong className="text-white">What we do with your photo.</strong> When you upload a photo, it is stored securely and sent to our AI processing partner (Replicate) to convert it into line art. That is the only purpose it is used for.</li>
            <li><strong className="text-white">Who can see it.</strong> Your photos and generated pages are stored in private storage. They are not published, not shown to other users, and not browsable by anyone else. Files are only accessible through temporary, expiring secure links.</li>
            <li><strong className="text-white">We do not use your photos to train AI models</strong>, and we do not sell or share them for advertising or any other commercial purpose.</li>
            <li><strong className="text-white">How long we keep it.</strong> We keep uploaded photos and generated pages in secure private storage so you can access your downloads. If you have an account, you can delete any page — or your whole account and all its content — at any time. Without an account, email us and we will delete your files on request.</li>
            <li><strong className="text-white">Children do not create accounts.</strong> colour.page is intended for parents, carers and teachers. Accounts are for adults only. We do not knowingly collect personal data directly from children. If you believe a child has created an account, contact us and we will delete it.</li>
          </ul>
        </Section>

        <Section title="2. Information we collect">
          <p className="mb-2"><strong className="text-white">If you use colour.page without an account:</strong></p>
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li>Photos and learning topics you submit, and the pages generated from them</li>
            <li>A randomly generated device identifier stored in your browser, so your pages appear on your device</li>
            <li>Basic technical information (device/browser type, approximate region, error logs)</li>
          </ul>
          <p className="mb-2"><strong className="text-white">If you create an account:</strong></p>
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li>Your email address</li>
            <li>Your password (stored securely in hashed form — we never see it), or, if you sign in with Google or Apple, basic profile information from that provider</li>
            <li>Your saved pages and collection</li>
            <li>Your subscription status</li>
          </ul>
          <p className="mb-2"><strong className="text-white">If you subscribe to Pro:</strong></p>
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li>Billing is handled entirely by Stripe. We never see or store your card number. We hold your email address and your subscription status.</li>
          </ul>
          <p className="mb-2"><strong className="text-white">If you buy a printer or other physical product:</strong></p>
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li>Your name, delivery address and contact details, so we can send your order</li>
            <li>Your order history. Payment is processed by Stripe; we do not store card details.</li>
          </ul>
          <p className="mb-2"><strong className="text-white">Usage analytics:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>We record the learning topics people type in (e.g. &ldquo;letter b&rdquo;, &ldquo;dinosaurs&rdquo;), how many pages are generated, and whether generations succeed or fail. This helps us decide what to build and improve.</li>
            <li>We use a short-lived, anonymous signal to see how many people are using the site at a given moment.</li>
            <li>These analytics are viewed in aggregate. Please avoid typing personal information (such as a child&rsquo;s full name) into the learning topic box.</li>
          </ul>
        </Section>

        <Section title="3. Why we use your information, and our lawful basis">
          <p className="mb-4">Under UK GDPR we must have a lawful basis for using your data. Ours are:</p>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border border-zinc-800 rounded-lg">
              <thead className="bg-zinc-900/60 text-white text-left">
                <tr><th className="p-2">What we do</th><th className="p-2">Why</th><th className="p-2">Lawful basis</th></tr>
              </thead>
              <tbody className="text-gray-400">
                {[
                  ['Generate and deliver your colouring pages and activity sheets', 'To provide the service you asked for', 'Performance of a contract'],
                  ['Create and maintain your account', 'To let you log in and save pages', 'Performance of a contract'],
                  ['Process Pro payments', 'To take payment and manage your subscription', 'Performance of a contract'],
                  ['Fulfil and deliver physical orders', 'To send you what you bought', 'Performance of a contract'],
                  ['Send you your generated pages by email (if requested)', 'To deliver what you asked for', 'Performance of a contract'],
                  ['Usage analytics and service improvement', 'To fix problems and build what families need', 'Legitimate interests'],
                  ['Security, fraud prevention and usage limits', 'To keep the service safe and available', 'Legitimate interests'],
                  ['Keeping order and payment records', 'To meet accounting and tax obligations', 'Legal obligation'],
                ].map((row, i) => (
                  <tr key={i} className="border-t border-zinc-800 align-top">
                    <td className="p-2">{row[0]}</td><td className="p-2">{row[1]}</td><td className="p-2">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>We do not use your data for advertising, and we do not sell it to anyone.</p>
        </Section>

        <Section title="4. Who we share it with">
          <p className="mb-4">We use a small number of trusted service providers (&ldquo;processors&rdquo;) to run colour.page. They may only use your data to provide their service to us.</p>
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li><strong className="text-white">Supabase</strong> — database, authentication and file storage</li>
            <li><strong className="text-white">Replicate</strong> — AI processing that turns your photo or topic into line art</li>
            <li><strong className="text-white">Stripe</strong> — payment processing for subscriptions and orders</li>
            <li><strong className="text-white">Resend</strong> — sending emails (such as your generated pages)</li>
            <li><strong className="text-white">Vercel</strong> — website hosting</li>
            <li><strong className="text-white">Google / Apple</strong> — only if you choose to sign in with them</li>
            <li><strong className="text-white">Delivery partners</strong> — for physical orders, we share the name and address needed to deliver your parcel</li>
          </ul>
          <p className="mb-4">Some of these providers are based outside the UK, including in the United States. Where your data is transferred internationally, it is protected by appropriate safeguards such as UK International Data Transfer Agreements or Standard Contractual Clauses.</p>
          <p>We may also disclose information where we are legally required to do so.</p>
        </Section>

        <Section title="5. Cookies and similar technologies">
          <p className="mb-4">We use only what&rsquo;s necessary to make the site work:</p>
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li><strong className="text-white">Essential cookies</strong> — to keep you signed in and keep your session secure</li>
            <li><strong className="text-white">Local storage</strong> — to remember your device so your pages appear when you return, even without an account</li>
          </ul>
          <p>We do not use advertising or third-party tracking cookies.</p>
        </Section>

        <Section title="6. How we keep your information safe">
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li>Files are held in private storage and served only via temporary, expiring secure links — never public URLs</li>
            <li>Passwords are hashed and never visible to us</li>
            <li>Payment details are handled entirely by Stripe and never touch our systems</li>
            <li>Access to our systems is restricted</li>
          </ul>
          <p>No service can promise perfect security, but we take this seriously — particularly given the nature of the images involved.</p>
        </Section>

        <Section title="7. Your rights">
          <p className="mb-4">Under UK data protection law you have the right to:</p>
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li><strong className="text-white">Access</strong> the personal data we hold about you</li>
            <li><strong className="text-white">Correct</strong> anything inaccurate</li>
            <li><strong className="text-white">Delete</strong> your data (&ldquo;right to erasure&rdquo;)</li>
            <li><strong className="text-white">Object to or restrict</strong> how we use it</li>
            <li><strong className="text-white">Portability</strong> — receive your data in a usable format</li>
            <li><strong className="text-white">Withdraw consent</strong> where we rely on it</li>
          </ul>
          <p className="mb-2"><strong className="text-white">How to delete your data:</strong></p>
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li>If you have an account, you can delete individual pages, or delete your entire account and all associated content, from your account settings</li>
            <li>Without an account, or for any other request, email <a href={`mailto:${CONTACT}`} className="text-brand-primary hover:underline">{CONTACT}</a> and we will action it within one month</li>
          </ul>
          <p><strong className="text-white">Complaints:</strong> If you&rsquo;re unhappy with how we&rsquo;ve handled your data, please contact us first — we&rsquo;d genuinely like to put it right. You also have the right to complain to the Information Commissioner&rsquo;s Office (ICO), the UK&rsquo;s data protection regulator, at <a href="https://ico.org.uk" className="text-brand-primary hover:underline">ico.org.uk</a>.</p>
        </Section>

        <Section title="8. Changes to this policy">
          <p>If we make significant changes, we will update the date at the top and, where appropriate, let you know in the app or by email.</p>
        </Section>

        <Section title="9. Contact us">
          <p className="mb-2">Questions, concerns, or requests about your data:</p>
          <p className="mb-2"><strong className="text-white">Email:</strong> <a href={`mailto:${CONTACT}`} className="text-brand-primary hover:underline">{CONTACT}</a></p>
          <p><strong className="text-white">Post:</strong> Ozeco Ltd, Unit A James Carter Road, Mildenhall, Bury St. Edmunds, England, IP28 7DE</p>
        </Section>

        <p className="text-gray-500 text-sm italic mt-10">This policy is provided in good faith and in plain English. It is not legal advice; as colour.page grows it&rsquo;s worth having a solicitor review it.</p>
      </main>

      <PageFooter />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-semibold text-white mb-4">{title}</h2>
      {children}
    </section>
  )
}
