import { useEffect, useState, type RefObject } from 'react'

interface Size {
  width: number
  height: number
}

export const useResizeObserver = <T extends HTMLElement>(
  targetRef: RefObject<T | null>,
): Size => {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })

  useEffect(() => {
    const element = targetRef.current
    if (!element) {
      setSize({ width: 0, height: 0 })
      return
    }

    const updateSize = () => {
      setSize({
        width: element.clientWidth,
        height: element.clientHeight,
      })
    }

    updateSize()

    const resizeObserver = new ResizeObserver(() => {
      updateSize()
    })

    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
    }
  }, [targetRef])

  return size
}

export default useResizeObserver
