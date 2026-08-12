/**
 * 题库加载与管理 Hook
 *
 * 流程:
 *   1. 加载 public/questions.md → 解析为 Question[]
 *   2. 从 IndexedDB 读取已有统计数据
 *   3. 合并（新题目插入，已有题目保留统计）
 *   4. 构建 statsMap 用于选题
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Question, QuestionStats } from '../types';
import { parseQuestions } from '../utils/parser';
import { syncQuestions, getAllQuestions } from '../utils/db';
import { selectNextQuestion } from '../utils/selection';

export interface UseQuestionsReturn {
  /** 所有题目 */
  questions: Question[];
  /** 题目统计映射 */
  statsMap: Map<string, QuestionStats>;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 选择下一题（考虑加权 + 排除已答） */
  pickNext: (excludeIds: Set<string>, reviewMode?: boolean) => Question | null;
  /** 刷新题库（重新从 MD 加载） */
  refresh: () => Promise<void>;
}

export function useQuestions(): UseQuestionsReturn {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [statsMap, setStatsMap] = useState<Map<string, QuestionStats>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const questionsRef = useRef<Question[]>([]);
  const statsMapRef = useRef<Map<string, QuestionStats>>(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. 加载并解析 Markdown 题库
      const response = await fetch('/questions.md');
      if (!response.ok) {
        throw new Error(
          `题库加载失败: HTTP ${response.status}`,
        );
      }
      const md = await response.text();
      const parsed = parseQuestions(md);

      if (parsed.length === 0) {
        throw new Error('题库解析结果为空，请检查 questions.md 格式');
      }

      // 2. 同步到 IndexedDB（合并统计数据）
      await syncQuestions(parsed);

      // 3. 从 IndexedDB 读取完整数据（含统计）
      const allStats = await getAllQuestions();

      // 4. 构建 statsMap
      const map = new Map<string, QuestionStats>();
      for (const s of allStats) {
        map.set(s.id, s);
      }

      // 5. 更新状态
      questionsRef.current = parsed;
      statsMapRef.current = map;
      setQuestions(parsed);
      setStatsMap(map);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : '未知错误';
      setError(msg);
      console.error('题库加载失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    load();
  }, [load]);

  const pickNext = useCallback(
    (excludeIds: Set<string>, reviewMode = false): Question | null => {
      return selectNextQuestion(
        questionsRef.current,
        statsMapRef.current,
        { excludeIds, reviewMode },
      );
    },
    [],
  );

  return {
    questions,
    statsMap,
    loading,
    error,
    pickNext,
    refresh: load,
  };
}
