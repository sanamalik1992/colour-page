'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Check, Crown, Star, ArrowRight, Sparkles, Zap } from 'lucide-react'

const plans = [
  { name: 'Free', price: '£0', period: 'forever', description: 'Perfect for trying out', features: ['3 coloring pages per month', 'Standard quality', 'Email delivery', 'Basic support'], cta: 'Get Started', href: '/', popular: false },
  { name: 'Pro', price: '£4.99', period: 'per month', description: 'For families & educators', features: ['Unlimited coloring pages', 'HD quality downloads', 'Dot-to-dot generator', 'No watermarks', 'Priority processing', 'Direct download', 'Priority support'], cta: 'Start Pro Trial', href: '/api/stripe/checkout-subscription', popular: true },
  { name: 'Pro Annual', price: '£39.99', period: 'per year', description: 'Best value - save 33%', features: ['Everything in Pro', '2 months free', 'Early access to features', 'Commercial license'], cta: 'Get Annual Plan', href: '/api/stripe/checkout-subscription?plan=annual', popular: false },
]

const testimonials = [
  { quote: "My kids absolutely love the coloring pages! The dot-to-dot feature is brilliant.", author: "Sarah M.", role: "Parent of 3" },
  { quote: "I use this weekly for my classroom. The quality is outstanding.", author: "James T.", role: "Primary School Teacher" },
  { quote: "Finally, a tool that creates professional coloring pages. Worth every penny.", author: "Emma K.", role: "Children's Book Author" },
]

export default function ProPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative w-12 h-12"><Image src="/logo.png" alt="colour.page" fill className="object-contain" priority unoptimized /></div>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/" className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">Create</Link>
              <Link href="/dot-to-dot" className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">Dot-to-Dot</Link>
              <Link href="/print" className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">Print</Link>
            </nav>
            <Link href="/pro" className="h-10 px-5 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold text-sm rounded-lg flex items-center shadow-md">Pro</Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 via-transparent to-brand-border/10" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-brand-primary/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-brand-border/20 rounded-full blur-3xl" />
        <div className="container mx-auto px-6 py-20 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-brand-primary/20 border border-brand-primary/30 rounded-full px-4 py-2 mb-6">
              <Crown className="w-4 h-4 text-brand-primary" /><span className="text-sm font-semibold text-brand-primary">Upgrade to Pro</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">Unlimited Creativity,<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-glow">Unlimited Fun</span></h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">Create unlimited coloring pages, unlock dot-to-dot puzzles, and get HD downloads. Perfect for families, teachers, and creative professionals.</p>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Check className="w-4 h-4 text-brand-primary" />7-day free trial</span>
              <span className="flex items-center gap-1"><Check className="w-4 h-4 text-brand-primary" />Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div key={plan.name} className={`relative rounded-2xl p-8 ${plan.popular ? 'bg-gradient-to-b from-brand-primary/20 to-zinc-800/50 border-2 border-brand-primary shadow-2xl shadow-brand-primary/20 scale-105' : 'bg-zinc-800/50 border border-zinc-700'}`}>
              {plan.popular && <div className="absolute -top-4 left-1/2 -translate-x-1/2"><span className="bg-gradient-to-r from-brand-primary to-brand-border text-white text-sm font-bold px-4 py-1 rounded-full">Most Popular</span></div>}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1"><span className="text-4xl font-bold text-white">{plan.price}</span><span className="text-gray-400">/{plan.period}</span></div>
                <p className="text-sm text-gray-400 mt-2">{plan.description}</p>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (<li key={feature} className="flex items-start gap-3"><Check className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" /><span className="text-gray-300 text-sm">{feature}</span></li>))}
              </ul>
              <Link href={plan.href} className={`w-full h-12 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all ${plan.popular ? 'bg-gradient-to-r from-brand-primary to-brand-border hover:from-brand-border hover:to-brand-hover text-white shadow-lg' : 'bg-zinc-700 hover:bg-zinc-600 text-white'}`}>{plan.cta}<ArrowRight className="w-4 h-4" /></Link>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-6 py-16">
        <div className="text-center mb-12"><h2 className="text-3xl font-bold text-white mb-4">Pro Features</h2></div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[{icon: Sparkles, title: 'Unlimited Generations', desc: 'Create as many coloring pages as you want.'}, {icon: Zap, title: 'Dot-to-Dot Generator', desc: 'Turn any photo into a connect-the-dots puzzle.'}, {icon: Star, title: 'HD Quality', desc: 'High-resolution files perfect for printing.'}, {icon: Crown, title: 'No Watermarks', desc: 'Clean output perfect for classroom use.'}, {icon: Zap, title: 'Priority Processing', desc: 'Skip the queue and get results faster.'}, {icon: Check, title: 'Direct Download', desc: 'Download instantly without email verification.'}].map((f, i) => (
            <div key={i} className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6 hover:border-brand-primary/50 transition-colors">
              <div className="w-12 h-12 bg-brand-primary/20 rounded-xl flex items-center justify-center mb-4"><f.icon className="w-6 h-6 text-brand-primary" /></div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-6 py-16">
        <div className="text-center mb-12"><h2 className="text-3xl font-bold text-white mb-4">Loved by Thousands</h2></div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6">
              <div className="flex gap-1 mb-4">{[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-brand-primary text-brand-primary" />)}</div>
              <p className="text-gray-300 mb-4 italic">&ldquo;{t.quote}&rdquo;</p>
              <p className="font-semibold text-white">{t.author}</p>
              <p className="text-sm text-gray-400">{t.role}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-6 py-16">
        <div className="bg-gradient-to-r from-brand-primary/20 to-brand-border/20 border border-brand-primary/30 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to unlock unlimited creativity?</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">Join thousands of families and educators creating amazing coloring activities.</p>
          <Link href="/api/stripe/checkout-subscription" className="inline-flex items-center gap-2 h-14 px-8 bg-gradient-to-r from-brand-primary to-brand-border text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-glow">Start Free Trial<ArrowRight className="w-5 h-5" /></Link>
          <p className="text-sm text-gray-500 mt-4">No credit card required • Cancel anytime</p>
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3"><div className="relative w-8 h-8"><Image src="/logo.png" alt="colour.page" fill className="object-contain" unoptimized /></div><span className="text-gray-400 text-sm">© 2025 colour.page</span></div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
