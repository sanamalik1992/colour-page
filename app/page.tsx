import { Header } from '@/components/ui/header'
import { GeneratorCard } from '@/components/generator/generator-card'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Header />
      
      <main className="container mx-auto px-6 py-16">
        <div className="max-w-[700px] mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-black text-gray-900 mb-4 tracking-tight">
              Upload a Photo,<br />
              Print & Colour
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              Generate colouring pages in seconds using AI.
            </p>
            <p className="text-lg text-gray-900 font-semibold">
              Try it free.
            </p>
          </div>

          {/* Generator Card */}
          <GeneratorCard />
        </div>
      </main>
    </div>
  )
}