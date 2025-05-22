"use client"

import { useRef, useEffect, useState } from "react"
import PropTypes from "prop-types"

function WordDefinitionsPanel({ wordDefinitions }) {
  const [displayedDefs, setDisplayedDefs] = useState(wordDefinitions)
  const [isShifting, setIsShifting] = useState(false)
  const listRef = useRef(null)
  const prevWords = useRef(wordDefinitions.map((wd) => wd.word))

  useEffect(() => {
    // If a new word is added and panel is full, animate out the last card, then shift
    if (
      wordDefinitions.length > 0 &&
      displayedDefs.length > 0 &&
      (wordDefinitions.length !== displayedDefs.length || wordDefinitions[0].word !== prevWords.current[0])
    ) {
      setIsShifting(true)
      // Wait for fade-out animation (300ms), then update displayedDefs
      setTimeout(() => {
        setDisplayedDefs(wordDefinitions)
        setIsShifting(false)
      }, 300)
    } else {
      setDisplayedDefs(wordDefinitions)
    }
    prevWords.current = wordDefinitions.map((wd) => wd.word)
  }, [wordDefinitions])

  return (
    <div className="card p-4 mb-4">
      <h3 className="text-lg font-semibold mb-3">Recent Words & Definitions</h3>
      <div className={`transition-all duration-300 ${isShifting ? "opacity-50" : "opacity-100"}`}>
        {displayedDefs.length === 0 && <div className="text-center py-6 text-white/50">No words submitted yet.</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {displayedDefs.map(({ word, definitions }, idx) => (
            <div
              className={`bg-white/5 rounded-lg overflow-hidden transition-all duration-300 ${
                isShifting && idx === displayedDefs.length - 1 ? "opacity-0 scale-95" : "opacity-100 scale-100"
              }`}
              key={word + idx}
            >
              <div className="bg-white/10 p-3 font-medium text-center">{word}</div>
              <div className="p-3">
                {definitions && definitions.length > 0 ? (
                  <ul className="space-y-2">
                    {definitions.map((def, i) => (
                      <li key={i} className="text-sm text-white/70">
                        {i + 1}. {def}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-sm text-white/50 py-2">No definition found.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

WordDefinitionsPanel.propTypes = {
  wordDefinitions: PropTypes.arrayOf(
    PropTypes.shape({
      word: PropTypes.string.isRequired,
      definitions: PropTypes.arrayOf(PropTypes.string).isRequired,
    }),
  ).isRequired,
}

export default WordDefinitionsPanel
