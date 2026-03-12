import { useRef, useEffect, useMemo } from 'react'

export default function LyricsDisplay({ lyrics, currentIndex, currentTime }) {
  const containerRef = useRef(null)

  // Group individual syllables/fragments into lines
  const lines = useMemo(() => {
    if (!lyrics || lyrics.length === 0) return []

    const result = []
    let currentLine = { text: '', startIndex: 0, time: 0 }

    for (let i = 0; i < lyrics.length; i++) {
      const item = lyrics[i]
      let text = item.text

      // New line indicators in KAR format
      if (text.startsWith('\n') || text.startsWith('\r') || text.startsWith('/') || text.startsWith('\\')) {
        if (currentLine.text.trim()) {
          result.push({ ...currentLine, endIndex: i - 1 })
        }
        currentLine = { text: '', startIndex: i, time: item.time }
        text = text.replace(/^[\n\r/\\]+/, '')
      }

      currentLine.text += text
    }

    if (currentLine.text.trim()) {
      result.push({ ...currentLine, endIndex: lyrics.length - 1 })
    }

    return result
  }, [lyrics])

  // Find current line
  const currentLineIndex = useMemo(() => {
    if (currentIndex < 0) return -1
    return lines.findIndex(line => currentIndex >= line.startIndex && currentIndex <= line.endIndex)
  }, [currentIndex, lines])

  // Auto-scroll to current line
  useEffect(() => {
    if (currentLineIndex < 0 || !containerRef.current) return
    const elements = containerRef.current.querySelectorAll('.kara-line')
    const el = elements[currentLineIndex]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentLineIndex])

  if (!lyrics || lyrics.length === 0) {
    return (
      <div className="kara-lyrics" ref={containerRef}>
        <div className="kara-lyrics-empty">
          <div className="kara-lyrics-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
          <p>No lyrics available</p>
          <p className="kara-lyrics-empty-sub">Enjoy the instrumental!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="kara-lyrics" ref={containerRef}>
      <div className="kara-lyrics-scroll">
        {lines.map((line, i) => {
          let state = 'upcoming'
          if (i === currentLineIndex) state = 'active'
          else if (i < currentLineIndex) state = 'past'

          // Show a few lines around current
          const distance = Math.abs(i - currentLineIndex)
          const isNearby = currentLineIndex < 0 ? i < 8 : distance <= 4

          return (
            <div
              key={i}
              className={`kara-line kara-line-${state}`}
              style={{
                opacity: isNearby ? (state === 'active' ? 1 : state === 'past' ? 0.35 : 0.5) : 0.15,
              }}
            >
              {line.text.trim() || '\u00A0'}
            </div>
          )
        })}
      </div>
    </div>
  )
}
