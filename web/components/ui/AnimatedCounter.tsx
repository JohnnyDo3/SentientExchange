'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value?: number;
  from?: number;
  to?: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}

export default function AnimatedCounter({
  value,
  from = 0,
  to,
  duration = 2000,
  suffix = '',
  prefix = '',
  decimals = 0,
}: AnimatedCounterProps) {
  // Support both patterns: value prop or from/to props
  const targetValue = to !== undefined ? to : (value !== undefined ? value : 0);
  const startValue = from;

  const [count, setCount] = useState(startValue);
  const startTime = useRef<number | null>(null);
  const animationFrame = useRef<number>();

  useEffect(() => {
    startTime.current = null;
    setCount(startValue);

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = timestamp - startTime.current;
      const percentage = Math.min(progress / duration, 1);

      // Easing function (ease out cubic)
      const eased = 1 - Math.pow(1 - percentage, 3);
      const difference = targetValue - startValue;
      setCount(startValue + difference * eased);

      if (percentage < 1) {
        animationFrame.current = requestAnimationFrame(animate);
      } else {
        setCount(targetValue);
      }
    };

    animationFrame.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [targetValue, startValue, duration]);

  return (
    <span>
      {prefix}
      {count.toFixed(decimals)}
      {suffix}
    </span>
  );
}
