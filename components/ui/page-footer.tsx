'use client'

import Link from 'next/link'

export function PageFooter() {
  return (
    <footer className="border-t border-zinc-800 py-10">
      <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="text-gray-400 text-sm">&copy; {new Date().getFullYear()} colour.page</span>
        <div className="flex gap-6 text-sm text-gray-400">
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
        </div>
      </div>
    </footer>
  )
}
