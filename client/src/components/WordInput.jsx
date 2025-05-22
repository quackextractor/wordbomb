"use client"

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react"
import PropTypes from "prop-types"

const WordInput = forwardRef(function WordInput({ onSubmit, disabled, wordpiece }, ref) {
    const [inputValue, setInputValue] = useState("")
    const [error, setError] = useState("")
    const [usedWords, setUsedWords] = useState(new Set())
    const [wordList, setWordList] = useState(null)
    const inputRef = useRef(null)

    useImperativeHandle(
        ref,
        () => ({
            clearUsedWords: () => setUsedWords(new Set()),
        }),
        [],
    )

    useEffect(() => {
        if (!disabled && inputRef.current) {
            inputRef.current.focus()
        }
    }, [disabled])

    useEffect(() => {
        setInputValue("")
        setError("")
    }, [wordpiece])

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

        if (usedWords.has(term)) {
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
        setInputValue(e.target.value)
        setError("")
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
            if (!error && !usedWords.has(word)) {
                setError("Word not found in dictionary.")
            }
            return
        }

        setUsedWords((prev) => new Set(prev).add(word))
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
                        className={`input-field rounded-r-none ${error ? "border-red-500" : ""} ${disabled ? "bg-white/5 text-white/50" : ""}`}
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
}

export default WordInput
