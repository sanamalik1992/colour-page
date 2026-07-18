import { redirect } from 'next/navigation'

// The colouring-page library has been consolidated at /print-pages.
// This legacy route redirects there so old links and bookmarks keep working.
export default function PrintPage() {
  redirect('/print-pages')
}
