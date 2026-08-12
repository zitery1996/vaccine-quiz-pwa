/**
 * 倒计时 Hook
 *
 * @param initialSeconds 初始倒计时秒数（默认 300 = 5 分钟）
 * @returns { seconds, isRunning, isExpired, start, stop, reset, formatted }
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export function useTimer(initialSeconds = 300) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 清理定时器
  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  const start = useCallback(() => {
    setSeconds(initialSeconds);
    setIsRunning(true);
    setIsExpired(false);

    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearTimer();
          setIsRunning(false);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [initialSeconds, clearTimer]);

  const stop = useCallback(() => {
    clearTimer();
    setIsRunning(false);
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setSeconds(initialSeconds);
    setIsRunning(false);
    setIsExpired(false);
  }, [initialSeconds, clearTimer]);

  /**
   * 格式化为 MM:SS
   */
  const formatted = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return {
    seconds,
    isRunning,
    isExpired,
    start,
    stop,
    reset,
    formatted,
  };
}
