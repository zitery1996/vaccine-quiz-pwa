/**
 * 统计数据 Hook
 *
 * 从 IndexedDB 读取所有题目的答题统计
 */

import { useState, useCallback, useEffect } from 'react';
import type { QuestionStats } from '../types';
import { getAllQuestions, resetStats } from '../utils/db';

export interface UseStatsReturn {
  /** 所有题目统计 */
  stats: QuestionStats[];
  /** 加载状态 */
  loading: boolean;
  /** 总答题次数 */
  totalAttempts: number;
  /** 总正确次数 */
  totalCorrect: number;
  /** 整体正确率 (0-100) */
  accuracy: number;
  /** 错题数量 */
  wrongCount: number;
  /** 刷新数据 */
  refresh: () => Promise<void>;
  /** 重置所有统计 */
  reset: () => Promise<void>;
}

export function useStats(): UseStatsReturn {
  const [stats, setStats] = useState<QuestionStats[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllQuestions();
      setStats(all);
    } catch (err) {
      console.error('加载统计数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalAttempts = stats.reduce(
    (sum, s) => sum + s.correctCount + s.wrongCount,
    0,
  );
  const totalCorrect = stats.reduce(
    (sum, s) => sum + s.correctCount,
    0,
  );
  const accuracy =
    totalAttempts === 0
      ? 0
      : Math.round((totalCorrect / totalAttempts) * 100);
  const wrongCount = stats.filter((s) => s.wrongCount > 0).length;

  const reset = useCallback(async () => {
    await resetStats();
    await load();
  }, [load]);

  return {
    stats,
    loading,
    totalAttempts,
    totalCorrect,
    accuracy,
    wrongCount,
    refresh: load,
    reset,
  };
}
