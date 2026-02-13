'use client'

import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'Sarah M.',
    role: 'Parent of 3',
    quote: 'My kids absolutely love turning their holiday photos into colouring pages. We print them out every weekend — it\'s become a family tradition!',
    stars: 5,
    avatar: 'S',
    color: 'from-pink-400 to-rose-500',
  },
  {
    name: 'James T.',
    role: 'Primary School Teacher',
    quote: 'I use this for my classroom all the time. The print library is amazing — hundreds of age-appropriate pages ready to go. The kids are always excited.',
    stars: 5,
    avatar: 'J',
    color: 'from-blue-400 to-indigo-500',
  },
  {
    name: 'Emma R.',
    role: 'Art Therapist',
    quote: 'The dot-to-dot generator is brilliant! I create custom puzzles for my therapy sessions. The quality of the line art is really impressive.',
    stars: 5,
    avatar: 'E',
    color: 'from-amber-400 to-orange-500',
  },
]

export function Testimonials() {
  return (
    <section className="container mx-auto px-6 py-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Loved by Parents & Teachers
          </h2>
          <p className="text-lg text-gray-400">
            Join thousands of happy users creating colouring pages every day
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="group relative bg-zinc-800/50 border border-zinc-700 rounded-2xl p-8 hover:border-zinc-600 transition-all duration-300"
            >
              <Quote className="w-8 h-8 text-brand-primary/20 mb-4" />

              <div className="flex gap-0.5 mb-4">
                {[...Array(t.stars)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                ))}
              </div>

              <p className="text-gray-300 mb-6 leading-relaxed text-sm">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="flex items-center gap-3 pt-4 border-t border-zinc-700">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-bold text-sm`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
