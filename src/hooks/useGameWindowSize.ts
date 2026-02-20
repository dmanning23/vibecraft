/**
 * useGameWindowSize Hook
 *
 * Responsive scaling hook for the village view.
 * Calculates multipliers for scaling game elements.
 *
 * Ported from PixelValley's GameWindowSize.js
 */

import { useState, useEffect, useCallback } from 'react'

export interface GameWindowSize {
  /** Actual window/container width */
  width: number
  /** Actual window/container height */
  height: number
  /** Scale factor for width (actual / default) */
  widthMultiplier: number
  /** Scale factor for height (actual / default) */
  heightMultiplier: number
  /** Minimum of width/height multipliers (for uniform scaling) */
  scale: number
}

export interface GameWindowSizeOptions {
  /** Default game width */
  defaultWidth?: number
  /** Default game height */
  defaultHeight?: number
  /** Element to observe (defaults to window) */
  containerRef?: React.RefObject<HTMLElement>
}

const DEFAULT_WIDTH = 2048
const DEFAULT_HEIGHT = 1024

/**
 * Hook that provides responsive sizing for the game view
 */
export function useGameWindowSize(options: GameWindowSizeOptions = {}): GameWindowSize {
  const {
    defaultWidth = DEFAULT_WIDTH,
    defaultHeight = DEFAULT_HEIGHT,
    containerRef,
  } = options

  const [size, setSize] = useState<GameWindowSize>({
    width: defaultWidth,
    height: defaultHeight,
    widthMultiplier: 1,
    heightMultiplier: 1,
    scale: 1,
  })

  const updateSize = useCallback(() => {
    let width: number
    let height: number

    if (containerRef?.current) {
      // Use container dimensions
      const rect = containerRef.current.getBoundingClientRect()
      width = rect.width
      height = rect.height
    } else {
      // Use window dimensions
      width = window.innerWidth
      height = window.innerHeight
    }

    const widthMultiplier = width / defaultWidth
    const heightMultiplier = height / defaultHeight
    const scale = Math.min(widthMultiplier, heightMultiplier)

    setSize({
      width,
      height,
      widthMultiplier,
      heightMultiplier,
      scale,
    })
  }, [defaultWidth, defaultHeight, containerRef])

  useEffect(() => {
    // Initial size
    updateSize()

    // Listen for resize
    window.addEventListener('resize', updateSize)

    // Use ResizeObserver for container if available
    let observer: ResizeObserver | null = null
    if (containerRef?.current) {
      observer = new ResizeObserver(updateSize)
      observer.observe(containerRef.current)
    }

    return () => {
      window.removeEventListener('resize', updateSize)
      observer?.disconnect()
    }
  }, [updateSize, containerRef])

  return size
}

/**
 * Calculate scaled dimensions
 */
export function scaleValue(value: number, multiplier: number): number {
  return value * multiplier
}

/**
 * Calculate scaled position
 */
export function scalePosition(
  x: number,
  y: number,
  widthMultiplier: number,
  heightMultiplier: number
): { x: number; y: number } {
  return {
    x: x * widthMultiplier,
    y: y * heightMultiplier,
  }
}
