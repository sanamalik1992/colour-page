'use client'

import { Upload, Sparkles, Download } from 'lucide-react'

const steps = [
  {
    icon: Upload,
    title: '1. Upload Photo',
    description: 'Choose any photo from your device',
  },
  {
    icon: Sparkles,
    title: '2. AI Generates',
    description: 'Our AI creates your colouring page',
  },
  {
    icon: Download,
    title: '3. Download & Print',
    description: 'Get your page instantly, ready to colour',
  },
]

export function HowItWorks() {
  return (
    <section className="container mx-auto px-6 py-16">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            How It Works
          </h2>
          <p className="text-lg text-gray-400">
            Three simple steps to create your colouring page
          </p>
        </div>
        
        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-8 text-center hover:border-brand-primary/50 transition-all duration-200"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-brand-primary to-brand-border rounded-2xl flex items-center justify-center mx-auto mb-6">
                <step.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                {step.title}
              </h3>
              <p className="text-gray-400">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
