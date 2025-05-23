"use client"

import {useEffect, useState} from "react"

/**
 * Component that displays a full-screen overlay effect when damage is taken
 */
function DamageOverlay({isActive}) {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (isActive) {
            setVisible(true)
            const timer = setTimeout(() => {
                setVisible(false)
            }, 500) // Duration of the effect
            return () => clearTimeout(timer)
        }
    }, [isActive])

    if (!visible) return null

    return (
        <div className="fixed inset-0 pointer-events-none z-50 bg-red-500/30 animate-damage-flash" aria-hidden="true"/>
    )
}

export default DamageOverlay
