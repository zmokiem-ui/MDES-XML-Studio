import { useState, useEffect } from 'react'

export function ThemeBackground({ theme, animationsEnabled }) {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    if (!animationsEnabled) return

    // Space Galaxy - shooting stars
    if (theme.isSpaceTheme) {
      const spawnStar = () => {
        const id = Date.now()
        setParticles(prev => [...prev, { id, type: 'star', top: Math.random() * 50 + '%', left: Math.random() * 50 + '%' }])
        setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 1500)
      }
      const interval = setInterval(spawnStar, 4000 + Math.random() * 4000)
      return () => clearInterval(interval)
    }

    // Ocean - bubbles
    if (theme.isOceanTheme) {
      const spawnBubble = () => {
        const id = Date.now()
        setParticles(prev => [...prev, { id, type: 'bubble', left: Math.random() * 100 + '%', size: 10 + Math.random() * 20, delay: Math.random() * 2 }])
        setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 8000)
      }
      const interval = setInterval(spawnBubble, 1500)
      return () => clearInterval(interval)
    }

    // Forest - falling leaves
    if (theme.isForestTheme) {
      const leaves = ['🍃', '🌿', '🍂', '🌱']
      const spawnLeaf = () => {
        const id = Date.now()
        setParticles(prev => [...prev, { id, type: 'leaf', left: Math.random() * 100 + '%', emoji: leaves[Math.floor(Math.random() * leaves.length)], delay: Math.random() * 5 }])
        setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 20000)
      }
      const interval = setInterval(spawnLeaf, 3000)
      return () => clearInterval(interval)
    }
  }, [theme.isSpaceTheme, theme.isOceanTheme, theme.isForestTheme, animationsEnabled])

  // Space Galaxy Theme
  if (theme.isSpaceTheme) {
    return (
      <>
        <div className="space-galaxy-bg" />
        <div className="space-galaxy-stars" />
        <div className="space-galaxy-nebula" />
        {particles.filter(p => p.type === 'star').map(star => (
          <div key={star.id} className="space-galaxy-shooting-star active" style={{ top: star.top, left: star.left }} />
        ))}
      </>
    )
  }

  // Cyberpunk Theme
  if (theme.isCyberpunkTheme) {
    return (
      <>
        <div className="cyberpunk-bg" />
        <div className="cyberpunk-grid" />
        <div className="cyberpunk-scanlines" />
      </>
    )
  }

  // Forest Theme
  if (theme.isForestTheme) {
    return (
      <>
        <div className="forest-bg" />
        <div className="forest-sunlight" />
        <div className="forest-leaves">
          {particles.filter(p => p.type === 'leaf').map(leaf => (
            <div key={leaf.id} className="forest-leaf" style={{ left: leaf.left, animationDelay: `${leaf.delay}s` }}>{leaf.emoji}</div>
          ))}
        </div>
      </>
    )
  }

  // Ocean Theme
  if (theme.isOceanTheme) {
    return (
      <>
        <div className="ocean-bg" />
        <div className="ocean-caustics" />
        <div className="ocean-bubbles">
          {particles.filter(p => p.type === 'bubble').map(bubble => (
            <div key={bubble.id} className="ocean-bubble" style={{ left: bubble.left, width: bubble.size, height: bubble.size, animationDelay: `${bubble.delay}s` }} />
          ))}
        </div>
      </>
    )
  }

  // Steampunk Theme
  if (theme.isSteampunkTheme) {
    return (
      <>
        <div className="steampunk-bg" />
        <div className="steampunk-panels" />
        <div className="steampunk-gears">
          <div className="steampunk-gear" style={{ width: 120, height: 120, top: '10%', right: '5%' }} />
          <div className="steampunk-gear reverse" style={{ width: 80, height: 80, top: '15%', right: '12%' }} />
          <div className="steampunk-gear" style={{ width: 100, height: 100, bottom: '20%', left: '8%' }} />
        </div>
      </>
    )
  }

  return null
}
