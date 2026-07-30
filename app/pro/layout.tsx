import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pro — Unlimited Colouring & Learning Sheets',
  description: 'Go Pro for unlimited printable colouring pages, learning sheets and activity packs, with no branding on your downloads. Monthly or yearly, cancel anytime.',
}

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return children
}
