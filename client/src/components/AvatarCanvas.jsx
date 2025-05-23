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
        <div className="flex flex-col items-center gap-6">
            <div className="relative">
                <canvas
                    ref={canvasRef}
                    width={300}
                    height={300}
                    className="rounded-lg border-4 border-gray-100 shadow-xl cursor-crosshair touch-none bg-white"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={(e) => startDrawing(e.touches[0])}
                    onTouchMove={(e) => draw(e.touches[0])}
                    onTouchEnd={stopDrawing}
                />
                <div className="absolute inset-0 rounded-lg pointer-events-none border border-gray-200/50"/>
            </div>

            <div className="flex flex-wrap gap-4 items-center justify-center">
                <div className="flex gap-2">
                    <input
                        type="color"
                        value={currentColor}
                        onChange={(e) => setCurrentColor(e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer"
                    />
                    <button
                        onClick={() => setTool("pen")}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            tool === "pen" ? "bg-blue-100" : "bg-gray-100"
                        }`}
                    >
                        ✏️
                    </button>
                    <button
                        onClick={() => setTool("eraser")}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            tool === "eraser" ? "bg-blue-100" : "bg-gray-100"
                        }`}
                    >
                        🧹
                    </button>
                </div>

                <div className="flex gap-2 items-center">
                    <label className="text-sm text-gray-600">Size:</label>
                    <input
                        type="range"
                        min="1"
                        max="50"
                        value={lineThickness}
                        onChange={(e) => setLineThickness(Number(e.target.value))}
                        className="w-32"
                    />
                </div>

                <select
                    value={selectedDefault}
                    onChange={(e) => setSelectedDefault(e.target.value)}
                    className="px-3 py-2 bg-gray-100 rounded-lg"
                >
                    <option value="circle">Circle</option>
                    <option value="square">Square</option>
                    <option value="triangle">Triangle</option>
                </select>

                <div className="flex gap-2">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                    />
                    <label
                        htmlFor="image-upload"
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
                    >
                        📁 Import
                    </label>
                    <button
                        onClick={handleClear}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        🗑️ Clear
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AvatarCanvas