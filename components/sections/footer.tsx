export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-900">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <h3 className="text-lg font-bold text-white mb-3">colour.page</h3>
              <p className="text-gray-400 text-sm">
                Transform your photos into beautiful colouring pages using AI. 
                Free to try, instant results.
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Product</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-gray-400 hover:text-brand-primary transition-colors">Features</a></li>
                <li><a href="#" className="text-sm text-gray-400 hover:text-brand-primary transition-colors">Pricing</a></li>
                <li><a href="#" className="text-sm text-gray-400 hover:text-brand-primary transition-colors">Examples</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-gray-400 hover:text-brand-primary transition-colors">About</a></li>
                <li><a href="#" className="text-sm text-gray-400 hover:text-brand-primary transition-colors">Privacy</a></li>
                <li><a href="#" className="text-sm text-gray-400 hover:text-brand-primary transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-zinc-800 text-center">
            <p className="text-sm text-gray-500">
              © 2026 colour.page. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}