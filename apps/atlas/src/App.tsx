import { DownloadSection } from '@/components/DownloadSection'
import { Features } from '@/components/Features'
import { Footer } from '@/components/Footer'
import { Hero } from '@/components/Hero'
import { Nav } from '@/components/Nav'

export function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Features />
        <DownloadSection />
      </main>
      <Footer />
    </>
  )
}
