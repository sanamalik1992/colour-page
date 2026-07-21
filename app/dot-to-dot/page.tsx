import { redirect } from 'next/navigation'

// The standalone dot-to-dot tool was removed. Keep the route as a permanent
// redirect so any old links land on the home page.
export default function DotToDotPage() {
  redirect('/')
}
