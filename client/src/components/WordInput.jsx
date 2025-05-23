"use client"

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useMemo } from "react"
import PropTypes from "prop-types"

// Update the WordInput component to use server-provided used words in online mode
const WordInput = forwardRef(function WordInput(
  { onSubmit, disabled, wordpiece, currentPlayerId, usedWords = new Set() },
  ref,
) {
  const [inputValue, setInputValue] = useState("")
  const [error, setError] = useState("")
  const [localUsedWords, setLocalUsedWords] = useState(new Set())
  const [wordList, setWordList] = useState(null)
  const inputRef = useRef(null)

  // Combine local and server-provided used words
  const allUsedWords = useMemo(() => {
    let serverWords = usedWords
    if (Array.isArray(usedWords)) {
      serverWords = new Set(usedWords)
    }
    const combined = new Set([...localUsedWords])
    if (serverWords && typeof serverWords[Symbol.iterator] === "function") {
      for (const word of serverWords) {
        combined.add(word)
      }
    }
    return combined
  }, [localUsedWords, usedWords])

  useImperativeHandle(
    ref,
    () => ({
      clearUsedWords: () => setLocalUsedWords(new Set()),
    }),
    [],
  )

  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus()
    }
  }, [disabled, currentPlayerId])

  useEffect(() => {
    setInputValue("")
    setError("")
  }, [wordpiece, currentPlayerId])

  // Load words.txt into memory once (client-side fetch)
  useEffect(() => {
    // Fetch words.txt from public/data or relative path
    fetch("/data/words.txt")
      .then((res) => res.text())
      .then((text) => {
        // Split by newlines, trim, and filter out empty lines
        const words = new Set(
          text
            .split(/\r?\n/)
            .map((w) => w.trim().toLowerCase())
            .filter(Boolean),
        )
        setWordList(words)
      })
  }, [])

  const validateWord = async (word) => {
    const term = word.trim().toLowerCase()

    if (allUsedWords.has(term)) {
      setError("Word can only be used once.")
      return false
    }

    // Check against local word list first
    if (wordList && !wordList.has(term)) {
      setError("Word not found in local dictionary.")
      console.log(`Word "${term}" not found in local dictionary.`)
    } else {
      setError("")
      return true
    }

    return false
  }

  const handleChange = (e) => {
    const value = e.target.value
    setInputValue(value)
    const word = value.trim().toLowerCase()
    if (allUsedWords.has(word) && word) {
      setError("Word can only be used once.")
    } else {
      setError("")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const word = inputValue.trim().toLowerCase()

    if (!word) {
      setError("Please enter a word")
      return
    }

    if (!word.includes(wordpiece?.toLowerCase())) {
      setError(`Word must contain "${wordpiece}"`)
      return
    }

    const isValid = await validateWord(word)
    if (!isValid) {
      // Only set error if not already set by validateWord
      if (!error && !allUsedWords.has(word)) {
        setError("Word not found in dictionary.")
      }
      return
    }

    setLocalUsedWords((prev) => new Set(prev).add(word))
    onSubmit(word)
    setInputValue("")
  }

  return (
    <div className="mb-6">
      <form onSubmit={handleSubmit} className="mb-2">
        <div className="flex">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleChange}
            placeholder={disabled ? "Wait for your turn..." : "Type a word containing the wordpiece"}
            disabled={disabled}
            autoComplete="off"
            className={`w-full px-4 py-3 bg-white/10 border border-white/20 rounded-l-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${error ? "border-red-500" : ""} ${disabled ? "bg-white/5 text-white/50" : ""}`}
          />
          <button
            type="submit"
            disabled={disabled || !inputValue.trim()}
            className={`px-6 py-3 font-medium rounded-r-lg transition-all duration-200 focus:outline-none ${
              disabled || !inputValue.trim()
                ? "bg-white/5 text-white/30 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
            }`}
          >
            Submit
          </button>
        </div>
        {error && (
          <div className="mt-2 p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm animate-slide-in">
            {error}
          </div>
        )}
      </form>

      <div className="text-center text-white/60 text-sm">
        Type any word containing <span className="font-bold text-white">"{wordpiece}"</span>
      </div>
    </div>
  )
})

WordInput.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  wordpiece: PropTypes.string,
  currentPlayerId: PropTypes.string,
  usedWords: PropTypes.oneOfType([
    PropTypes.object, // Set
    PropTypes.array,  // Array
  ]),
}

export default WordInput
