import { redirect } from 'next/navigation'

// The full photo-to-colouring generator now lives on the home page.
// This route is kept so existing links keep working.
export default function CreatePage() {
  redirect('/')
}
