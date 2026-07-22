import { Suspense } from 'react'
import { NavHeader } from '@/components/ui/nav-header'
import { PageFooter } from '@/components/ui/page-footer'
import { AuthForm } from '@/components/auth/auth-form'

export const metadata = { title: 'Log in · colour.page' }

export default function LoginPage() {
  return (
    <div className="min-h-screen app-bg flex flex-col">
      <NavHeader />
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-10 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-white">Welcome back</h1>
            <p className="text-gray-400 text-sm mt-1">Log in to see your saved pages and Pro.</p>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 sm:p-6">
            <Suspense fallback={null}>
              <AuthForm mode="login" />
            </Suspense>
          </div>
        </div>
      </main>
      <PageFooter />
    </div>
  )
}
