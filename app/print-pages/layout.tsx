import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free Printable Colouring Pages for Kids',
  description: 'Browse 300+ ready-to-print colouring pages and learning sheets for children — free to download and print at home or in the classroom.',
}

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children
}
