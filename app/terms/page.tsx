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

export default function TermsPage() {
  return (
    <div className="min-h-screen app-bg">
      <NavHeader />

      <main className="container mx-auto px-6 py-16 max-w-3xl">
        <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>
        <div className="prose prose-invert prose-lg max-w-none">
          <p className="text-gray-300 mb-6">Last updated: July 2026</p>

          <Section title="1. Who we are">
            <p>
              colour.page is operated by <strong className="text-white">Ozeco Ltd</strong>, a company registered in
              England and Wales (company number 15445991), registered office: Unit A James Carter Road, Mildenhall,
              Bury St. Edmunds, England, IP28 7DE.
            </p>
            <p>
              In these terms, &ldquo;we&rdquo;, &ldquo;us&rdquo; and &ldquo;our&rdquo; mean Ozeco Ltd, and
              &ldquo;you&rdquo; means you, the person using colour.page. You can reach us any time at{' '}
              <a href={`mailto:${CONTACT}`} className="text-brand-primary hover:underline">{CONTACT}</a>.
            </p>
          </Section>

          <Section title="2. Acceptance of these terms">
            <p>By using colour.page, creating an account, subscribing, or placing an order, you agree to these terms. If you do not agree, please do not use the service.</p>
            <p>You must be at least 18 years old to create an account, subscribe, or buy from us. colour.page is intended for parents, carers and teachers — accounts are for adults only.</p>
          </Section>

          <Section title="3. What we provide">
            <p>colour.page offers tools to turn a photo into a printable colouring page, create learning and activity sheets, and make dot-to-dot puzzles. You can make and preview sheets for free; downloading is available with a free account, subject to daily limits. Pro subscribers get higher or unlimited limits and unbranded downloads.</p>
            <p>We also sell physical products (such as a portable printer and accessory bundles) through our Shop. These are covered by sections 7 and 8 below.</p>
          </Section>

          <Section title="4. Your account and acceptable use">
            <p>You are responsible for keeping your login details secure and for activity on your account. Please:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>only upload photos and content you have the right to use;</li>
              <li>not upload unlawful, harmful, abusive, or otherwise inappropriate content, or anything that infringes someone else&rsquo;s rights;</li>
              <li>not misuse, disrupt, or attempt to gain unauthorised access to the service.</li>
            </ul>
            <p>We may suspend or close an account that breaches these terms.</p>
          </Section>

          <Section title="5. Your content and generated sheets">
            <p>You keep all rights to the photos and content you upload. Uploaded photos are used only to create your sheet and are automatically deleted from our systems within 48 hours of processing (see our Privacy Policy).</p>
            <p>The colouring pages, learning sheets and puzzles you generate are yours to print and use for personal, family and classroom purposes. Pro subscribers may also use their generated sheets commercially. You must not resell or redistribute the service itself, or content that is not your own.</p>
          </Section>

          <Section title="6. Pro subscriptions">
            <p>Pro is billed monthly or annually through our payment processor, Stripe. Prices are shown on the Pro page before you pay. Subscriptions renew automatically at the end of each billing period until you cancel; you can cancel at any time from your account and will keep access until the end of the period already paid for.</p>
            <p><strong className="text-white">14-day cancellation right.</strong> As a consumer you normally have 14 days to cancel a new subscription for a refund. Because Pro gives you immediate access to a digital service, by starting to use Pro within those 14 days you ask us to begin straight away and acknowledge you lose the automatic 14-day cancellation right for that period once the service has been fully provided. This does not affect your right to cancel future renewals at any time.</p>
          </Section>

          <Section title="7. Orders for physical products">
            <p>When you place an order in the Shop, that is an offer to buy. A contract is formed when we send you an order confirmation. We&rsquo;ll email confirmation and, when your item ships, a dispatch note with any tracking details.</p>
            <p>Payment is taken at checkout via Stripe. Prices include VAT where applicable and are shown before you pay; delivery costs (if any) are shown at checkout. If we discover a genuine pricing or description error, we&rsquo;ll contact you before dispatch and you can confirm at the correct price or cancel for a full refund.</p>
            <p>We aim to dispatch orders promptly and, unless stated otherwise, to deliver within 30 days.</p>
          </Section>

          <Section title="8. Cancellations, returns and faulty goods">
            <p><strong className="text-white">Right to cancel (14 days).</strong> For physical products you may cancel within 14 days of receiving your order, without giving a reason, under the Consumer Contracts Regulations 2013. To cancel, email us at <a href={`mailto:${CONTACT}`} className="text-brand-primary hover:underline">{CONTACT}</a>. You then have 14 days to return the goods; return postage is your responsibility unless the item is faulty or not as described. We&rsquo;ll refund the price (and standard outbound delivery) within 14 days of getting the goods back, or proof you&rsquo;ve sent them. Please return items unused and, where possible, in their original packaging; we may reduce a refund to reflect any loss in value from handling beyond what&rsquo;s needed to inspect the item.</p>
            <p><strong className="text-white">Faulty or misdescribed items.</strong> Under the Consumer Rights Act 2015, goods must be as described, fit for purpose and of satisfactory quality. If something is faulty or not as described, contact us and we&rsquo;ll put it right with a repair, replacement or refund as appropriate. Nothing in these terms affects your statutory rights.</p>
          </Section>

          <Section title="9. Availability and &ldquo;as is&rdquo;">
            <p>We work hard to keep colour.page running, but the service is provided on an &ldquo;as available&rdquo; basis and AI-generated results can vary — occasionally a sheet won&rsquo;t come out well, in which case please try again. We don&rsquo;t guarantee uninterrupted or error-free operation.</p>
          </Section>

          <Section title="10. Our liability">
            <p>We do not exclude or limit our liability where it would be unlawful to do so — this includes liability for death or personal injury caused by our negligence, for fraud, or for your statutory rights as a consumer.</p>
            <p>Subject to that, we are not liable for losses that were not reasonably foreseeable, or for business losses. For paid services and products, our total liability is limited to the amount you paid for the relevant subscription period or order.</p>
          </Section>

          <Section title="11. Changes">
            <p>We may update these terms from time to time — for example, to reflect new features or legal requirements. We&rsquo;ll change the &ldquo;last updated&rdquo; date above, and material changes affecting current subscribers or orders will be notified where appropriate. Continued use after changes means you accept the updated terms.</p>
          </Section>

          <Section title="12. Governing law and contact">
            <p>These terms are governed by the law of England and Wales, and disputes are subject to the courts of England and Wales. If you&rsquo;re a consumer, you may also have the right to bring proceedings in your own local courts.</p>
            <p>
              Questions, cancellations or complaints:{' '}
              <a href={`mailto:${CONTACT}`} className="text-brand-primary hover:underline">{CONTACT}</a> — or by post to
              Ozeco Ltd, Unit A James Carter Road, Mildenhall, Bury St. Edmunds, England, IP28 7DE.
            </p>
          </Section>
        </div>
      </main>

      <PageFooter />
    </div>
  )
}
