"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Canvas component for drawing player avatars
 */
function AvatarCanvas({ color = "#4287f5", onAvatarCreated }) {
    const canvasRef = useRef(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hasDrawn, setHasDrawn] = useState(false)
    const prevPos = useRef({ x: 0, y: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")

        if (!hasDrawn) {
            ctx.fillStyle = "#ffffff"
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            drawDefaultAvatar(ctx, color)
        }
    }, [color])

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")

        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        if (!hasDrawn) {
            drawDefaultAvatar(ctx, color)
        }

        saveAvatar()
    }, [color, hasDrawn])

    const drawDefaultAvatar = (ctx, color) => {
        const canvas = canvasRef.current
        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        const radius = canvas.width * 0.4

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius * 0.6, 0.2 * Math.PI, 0.8 * Math.PI)
        ctx.stroke()

        const eyeRadius = radius * 0.15
        const eyeOffsetX = radius * 0.3
        const eyeOffsetY = radius * 0.2

        ctx.fillStyle = "#ffffff"
        ctx.beginPath()
        ctx.arc(centerX - eyeOffsetX, centerY - eyeOffsetY, eyeRadius, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.arc(centerX + eyeOffsetX, centerY - eyeOffsetY, eyeRadius, 0, Math.PI * 2)
        ctx.fill()
    }

    const saveAvatar = () => {
        const canvas = canvasRef.current
        const dataUrl = canvas.toDataURL("image/png")
        if (onAvatarCreated) {
            onAvatarCreated(dataUrl)
        }
    }

    const handleMouseDown = (e) => {
        setIsDrawing(true)
        setHasDrawn(true)

        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        prevPos.current = { x, y }
    }

    const handleMouseMove = (e) => {
        if (!isDrawing) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        ctx.strokeStyle = color
        ctx.lineWidth = 5
        ctx.lineCap = "round"
        ctx.lineJoin = "round"

        ctx.beginPath()
        ctx.moveTo(prevPos.current.x, prevPos.current.y)
        ctx.lineTo(x, y)
        ctx.stroke()

        prevPos.current = { x, y }
    }

    const handleMouseUp = () => {
        if (isDrawing) {
            setIsDrawing(false)
            saveAvatar()
        }
    }
    
    const handleClear = () => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")

        // Clear the canvas
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Reset the hasDrawn state to trigger redrawing the default avatar
        setHasDrawn(false)

        // Force redraw of default avatar
        drawDefaultAvatar(ctx, color)

        // Save the cleared avatar
        saveAvatar()
    }

    const handleTouchStart = (e) => {
        e.preventDefault()
        const touch = e.touches[0]
        handleMouseDown({
            clientX: touch.clientX,
            clientY: touch.clientY,
        })
    }

    const handleTouchMove = (e) => {
        e.preventDefault()
        const touch = e.touches[0]
        handleMouseMove({
            clientX: touch.clientX,
            clientY: touch.clientY,
        })
    }

    const handleTouchEnd = (e) => {
        e.preventDefault()
        handleMouseUp()
    }

    return (
        <div className="flex flex-col items-center">
            <div className="relative mb-3">
                <canvas
                    ref={canvasRef}
                    width={150}
                    height={150}
                    className="rounded-full border-4 border-white/20 shadow-lg cursor-crosshair touch-none"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                />
                <div className="absolute inset-0 rounded-full pointer-events-none border border-white/10"></div>
            </div>
            <button
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                onClick={handleClear}
            >
                Clear & Reset
            </button>
        </div>
    )
}

export default AvatarCanvas
