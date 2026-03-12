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
    const elements = containerRef.current.querySelectorAll('.lyrics-line')
    const el = elements[currentLineIndex]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentLineIndex])

  if (!lyrics || lyrics.length === 0) {
    return (
      <div className="lyrics-display">
        <div className="lyrics-empty">
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>♪</div>
          <p>No lyrics available for this song</p>
          <p style={{ fontSize: '0.9rem', marginTop: 8 }}>Enjoy the music!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="lyrics-display" ref={containerRef}>
      {lines.map((line, i) => {
        let className = 'lyrics-line'
        if (i === currentLineIndex) className += ' active'
        else if (i < currentLineIndex) className += ' past'
        else className += ' upcoming'

        return (
          <div key={i} className={className}>
            {line.text.trim() || '\u00A0'}
          </div>
        )
      })}
    </div>
  )
}
