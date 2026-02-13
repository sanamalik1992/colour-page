'use client'

import { Upload, Sparkles, Download, ArrowRight } from 'lucide-react'

const steps = [
  {
    icon: Upload,
    title: 'Upload Photo',
    description: 'Choose any photo from your device — pets, family, landscapes, anything!',
    number: '01',
    color: 'from-blue-400 to-cyan-400',
  },
  {
    icon: Sparkles,
    title: 'AI Generates',
    description: 'Our AI analyses the image and creates clean, beautiful line art in seconds.',
    number: '02',
    color: 'from-brand-primary to-emerald-400',
  },
  {
    icon: Download,
    title: 'Download & Print',
    description: 'Get your A4 colouring page as PDF or PNG, ready to print and colour!',
    number: '03',
    color: 'from-violet-400 to-purple-500',
  },
]

export function HowItWorks() {
  return (
    <section className="container mx-auto px-6 py-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            How It Works
          </h2>
          <p className="text-lg text-gray-400">
            Three simple steps to create your colouring page
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-[2px] bg-gradient-to-r from-blue-400/30 via-brand-primary/30 to-violet-400/30" />

          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-8 text-center hover:border-zinc-600 transition-all duration-300 group">
                {/* Step number */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r ${step.color} text-white shadow-lg`}>
                    Step {step.number}
                  </span>
                </div>

                <div className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-6 mt-2 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <step.icon className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-xl font-bold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Arrow between cards on mobile */}
              {index < steps.length - 1 && (
                <div className="flex justify-center my-4 md:hidden">
                  <ArrowRight className="w-5 h-5 text-gray-600 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
