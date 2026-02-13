import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950">
      <div className="container mx-auto px-6 py-14">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-brand-primary to-brand-border rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">colour.page</h3>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                Transform your photos into beautiful colouring pages using AI.
                Free to try, instant results. Loved by parents and teachers everywhere.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2.5">
                <li><Link href="/create" className="text-sm text-gray-400 hover:text-brand-primary transition-colors">Create Page</Link></li>
                <li><Link href="/dot-to-dot" className="text-sm text-gray-400 hover:text-brand-primary transition-colors">Dot-to-Dot</Link></li>
                <li><Link href="/print-pages" className="text-sm text-gray-400 hover:text-brand-primary transition-colors">Print Library</Link></li>
                <li><Link href="/library" className="text-sm text-gray-400 hover:text-brand-primary transition-colors">My Library</Link></li>
                <li><Link href="/pro" className="text-sm text-gray-400 hover:text-brand-primary transition-colors">Go Pro</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2.5">
                <li><Link href="/privacy" className="text-sm text-gray-400 hover:text-brand-primary transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-sm text-gray-400 hover:text-brand-primary transition-colors">Terms of Service</Link></li>
                <li><Link href="/contact" className="text-sm text-gray-400 hover:text-brand-primary transition-colors">Contact Us</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © 2026 colour.page. All rights reserved.
            </p>
            <p className="text-xs text-gray-600">
              Made with love for creative families
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
