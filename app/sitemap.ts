import { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://colour.page'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const routes: { path: string; changeFrequency: 'weekly' | 'monthly'; priority: number }[] = [
    { path: '/', changeFrequency: 'weekly', priority: 1 },
    { path: '/print-pages', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/pro', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/contact', changeFrequency: 'monthly', priority: 0.4 },
    { path: '/privacy', changeFrequency: 'monthly', priority: 0.3 },
    { path: '/terms', changeFrequency: 'monthly', priority: 0.3 },
  ]

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))
}
