"use client"

import {useEffect, useRef, useState} from "react"

const defaultDrawings = {
    circle: (ctx, color) => {
        const centerX = ctx.canvas.width / 2
        const centerY = ctx.canvas.height / 2
        const radius = ctx.canvas.width * 0.4

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
        ctx.fill()
    },
    triangle: (ctx, color) => {
        const centerX = ctx.canvas.width / 2
        const centerY = ctx.canvas.height / 2
        const size = ctx.canvas.width * 0.4

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(centerX, centerY - size)
        ctx.lineTo(centerX + size, centerY + size)
        ctx.lineTo(centerX - size, centerY + size)
        ctx.closePath()
        ctx.fill()
    },
    square: (ctx, color) => {
        const centerX = ctx.canvas.width / 2
        const centerY = ctx.canvas.height / 2
        const size = ctx.canvas.width * 0.4

        ctx.fillStyle = color
        ctx.fillRect(centerX - size, centerY - size, size * 2, size * 2)
    }
}

function AvatarCanvas({onAvatarCreated}) {
    const canvasRef = useRef(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hasDrawn, setHasDrawn] = useState(false)
    const [currentColor, setCurrentColor] = useState("#4287f5")
    const [tool, setTool] = useState("pen")
    const [lineThickness, setLineThickness] = useState(5)
    const [selectedDefault, setSelectedDefault] = useState("circle")
    const [defaultColor, setDefaultColor] = useState("#4287f5")
    const prevPos = useRef({x: 0, y: 0})

    const generateRandomColor = () => {
        return `#${Math.floor(Math.random() * 16777215).toString(16)}`
    }

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")

        if (!hasDrawn) {
            ctx.fillStyle = "#ffffff"
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            const color = generateRandomColor()
            setDefaultColor(color)
            defaultDrawings[selectedDefault](ctx, color)
        }
    }, [hasDrawn, selectedDefault])

    const saveAvatar = () => {
        const canvas = canvasRef.current
        const dataUrl = canvas.toDataURL("image/png")
        onAvatarCreated?.(dataUrl)
    }

    const startDrawing = (e) => {
        setIsDrawing(true)
        setHasDrawn(true)
        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        prevPos.current = {x, y}
    }

    const draw = (e) => {
        if (!isDrawing) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        ctx.strokeStyle = tool === "eraser" ? "#ffffff" : currentColor
        ctx.lineWidth = lineThickness
        ctx.lineCap = "round"
        ctx.lineJoin = "round"

        ctx.beginPath()
        ctx.moveTo(prevPos.current.x, prevPos.current.y)
        ctx.lineTo(x, y)
        ctx.stroke()

        prevPos.current = {x, y}
    }

    const stopDrawing = () => {
        setIsDrawing(false)
        saveAvatar()
    }

    const handleClear = () => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        const color = generateRandomColor()
        setDefaultColor(color)
        defaultDrawings[selectedDefault](ctx, color)
        setHasDrawn(false)
        saveAvatar()
    }

    const handleImageUpload = (e) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const img = new Image()
            img.onload = () => {
                const canvas = canvasRef.current
                const ctx = canvas.getContext("2d")
                ctx.fillStyle = "#ffffff"
                ctx.fillRect(0, 0, canvas.width, canvas.height)
                const scale = Math.min(
                    canvas.width / img.width,
                    canvas.height / img.height
                )
                const width = img.width * scale
                const height = img.height * scale
                const x = (canvas.width - width) / 2
                const y = (canvas.height - height) / 2
                ctx.drawImage(img, x, y, width, height)
                setHasDrawn(true)
                saveAvatar()
            }
            img.src = event.target.result
        }
        reader.readAsDataURL(file)
    }

    return (
        <div className="flex flex-col items-center gap-6 p-4 bg-gray-800/20 backdrop-blur-sm rounded-lg">
            <div className="relative">
                <canvas
                    ref={canvasRef}
                    width={300}
                    height={300}
                    className="rounded-lg border-2 border-gray-700 shadow-xl cursor-crosshair touch-none bg-white"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={(e) => startDrawing(e.touches[0])}
                    onTouchMove={(e) => draw(e.touches[0])}
                    onTouchEnd={stopDrawing}
                />
                <div className="absolute inset-0 rounded-lg pointer-events-none border border-gray-600/50"/>
            </div>

            <div className="flex flex-wrap gap-4 items-center justify-center w-full max-w-md">
                <div className="flex gap-2 items-center p-2 bg-black/20 rounded-lg">
                    <input
                        type="color"
                        value={currentColor}
                        onChange={(e) => setCurrentColor(e.target.value)}
                        className="w-10 h-10 rounded-md cursor-pointer border-2 border-gray-700"
                    />
                    <button
                        onClick={() => setTool("pen")}
                        title="Pen"
                        className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors ${
                            tool === "pen" ? "bg-blue-500/50 text-white" : "bg-gray-700/50 hover:bg-gray-600/50"
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </button>
                    <button
                        onClick={() => setTool("eraser")}
                        title="Eraser"
                        className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors ${
                            tool === "eraser" ? "bg-blue-500/50 text-white" : "bg-gray-700/50 hover:bg-gray-600/50"
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 16 4 4"/></svg>
                    </button>
                </div>

                <div className="flex gap-2 items-center p-2 bg-black/20 rounded-lg">
                    <label htmlFor="lineThickness" className="text-sm text-gray-300">Size:</label>
                    <input
                        id="lineThickness"
                        type="range"
                        min="1"
                        max="50"
                        value={lineThickness}
                        onChange={(e) => setLineThickness(Number(e.target.value))}
                        className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>

                <select
                    value={selectedDefault}
                    onChange={(e) => setSelectedDefault(e.target.value)}
                    className="px-3 py-2 bg-gray-700/50 text-white rounded-md border-2 border-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                >
                    <option value="circle">Circle</option>
                    <option value="square">Square</option>
                    <option value="triangle">Triangle</option>
                </select>

                <div className="flex gap-2 items-center">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                    />
                    <label
                        htmlFor="image-upload"
                        className="px-3 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-md cursor-pointer transition-colors border-2 border-gray-600 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                        Import
                    </label>
                    <button
                        onClick={handleClear}
                        title="Clear Canvas"
                        className="px-3 py-2 bg-red-500/50 hover:bg-red-600/50 text-white rounded-md cursor-pointer transition-colors border-2 border-red-700 flex items-center gap-2"
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        Clear
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AvatarCanvas