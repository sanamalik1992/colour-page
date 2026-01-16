'use client'

import { useEffect, useState } from 'react'

export function Hero() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setTimeout(() => setShow(true), 100)
  }, [])

  return (
    <section className="container mx-auto px-6 pt-16 pb-12">
      <div className="max-w-4xl mx-auto text-center">
        <h1 
          className={`text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6 transition-all duration-700 ${
            show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Upload a Photo,<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-500">
            Print & Colour
          </span>
        </h1>
        
        <p 
          className={`text-xl text-gray-300 mb-2 transition-all duration-700 delay-200 ${
            show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Generate colouring pages in seconds using AI.
        </p>
        
        <p 
          className={`text-xl text-emerald-400 font-semibold transition-all duration-700 delay-300 ${
            show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Try it free.
        </p>
      </div>
    </section>
  )
}
