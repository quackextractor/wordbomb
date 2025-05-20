import React, { useRef, useEffect, useState } from 'react';
import '../assets/css/AvatarCanvas.css';

/**
 * Canvas component for drawing player avatars
 */
function AvatarCanvas({ color = '#4287f5', onAvatarCreated }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Previous position for smooth line drawing
  const prevPos = useRef({ x: 0, y: 0 });

  // Draw default when color changes (only if no user drawing yet)
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Only draw default if no existing drawing
    if (!hasDrawn) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawDefaultAvatar(ctx, color);
    }
  }, [color]); // hasDrawn intentionally omitted

  // Initialize canvas and notify parent when avatar changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Clear canvas and set background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw default avatar if no drawing
    if (!hasDrawn) {
      drawDefaultAvatar(ctx, color);
    }

    saveAvatar();
  }, [color, hasDrawn]);

  // Draw default avatar graphic
  const drawDefaultAvatar = (ctx, color) => {
    const canvas = canvasRef.current;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width * 0.4;

    // Draw circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw smile
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    // Draw eyes
    const eyeRadius = radius * 0.15;
    const eyeOffsetX = radius * 0.3;
    const eyeOffsetY = radius * 0.2;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX - eyeOffsetX, centerY - eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX + eyeOffsetX, centerY - eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
  };

  // Save avatar as data URL and notify parent
  const saveAvatar = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    if (onAvatarCreated) {
      onAvatarCreated(dataUrl);
    }
  };

  // Handle mouse down event
  const handleMouseDown = (e) => {
    setIsDrawing(true);
    setHasDrawn(true);

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    prevPos.current = { x, y };
  };

  // Handle mouse move event for drawing
  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(prevPos.current.x, prevPos.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    prevPos.current = { x, y };
  };

  // Handle end of drawing
  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveAvatar();
    }
  };

  // Clear canvas and reset to default
  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    setHasDrawn(false);
  };

  // Handle touch start for mobile drawing
  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseDown({
      clientX: touch.clientX,
      clientY: touch.clientY
    });
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseMove({
      clientX: touch.clientX,
      clientY: touch.clientY
    });
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    handleMouseUp();
  };

  return (
      <div className="avatar-canvas-container">
        <canvas
            ref={canvasRef}
            width={150}
            height={150}
            className="avatar-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        />
        <button
            className="clear-canvas-btn"
            onClick={handleClear}
        >
          Clear
        </button>
      </div>
  );
}

export default AvatarCanvas;
