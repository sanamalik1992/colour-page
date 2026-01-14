import { GeneratorCard } from '@/components/generator/generator-card'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Turn any photo into a colouring page
          </h1>
          <p className="mt-2 text-gray-600">
            Upload a photo, choose detail level, and generate a printable page.
          </p>
        </div>

        <GeneratorCard />
      </div>
    </main>
  )
}
