/**
 * 加权随机选题算法
 *
 * 权重计算公式:
 *   - 默认权重 = 1（未答过的题）
 *   - wrongCount > 0 时: weight = 1 + (wrongCount / (correctCount + wrongCount)) * 3
 *   - 即错误率越高，权重越大（最高 4 倍）
 *
 * 采样方式: 累积权重 + 二分查找 O(log n)
 */

import type { Question, QuestionStats } from '../types';

/**
 * 根据统计信息计算单道题的权重
 */
export function calculateWeight(stats: QuestionStats | undefined): number {
  if (!stats) return 1; // 未答过的题，默认权重

  const total = stats.correctCount + stats.wrongCount;
  if (total === 0) return 1;

  if (stats.wrongCount > 0) {
    const errorRate = stats.wrongCount / total;
    // 权重范围: 1 ~ 4
    return 1 + errorRate * 3;
  }

  // 全对 = 最低权重，减少出现频率
  return 0.5;
}

/**
 * 加权随机采样（累积权重 + 二分查找）
 *
 * @param questions 候选题目列表
 * @param statsMap 题目统计信息映射
 * @returns 选中题目在 questions 中的索引
 */
function weightedRandomIndex(
  questions: Question[],
  statsMap: Map<string, QuestionStats>,
): number {
  if (questions.length === 0) return -1;
  if (questions.length === 1) return 0;

  // 计算权重和累积权重
  const weights = questions.map((q) =>
    calculateWeight(statsMap.get(q.id)),
  );
  const prefixSums: number[] = [];
  let total = 0;
  for (const w of weights) {
    total += w;
    prefixSums.push(total);
  }

  // 生成随机数 [0, total)
  const rand = Math.random() * total;

  // 二分查找第一个 >= rand 的索引
  let lo = 0;
  let hi = prefixSums.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (prefixSums[mid] < rand) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/**
 * 选择下一道题
 *
 * @param questions 全部题目
 * @param statsMap 统计映射
 * @param options 配置
 * @returns 选中的题目，或 null（无可用题目）
 */
export function selectNextQuestion(
  questions: Question[],
  statsMap: Map<string, QuestionStats>,
  options: {
    /** 只从错题中选择 */
    reviewMode?: boolean;
    /** 本轮已答过的题目 ID 集合 */
    excludeIds?: Set<string>;
  } = {},
): Question | null {
  let candidates = questions;

  // 排除本轮已答过的题
  if (options.excludeIds && options.excludeIds.size > 0) {
    candidates = candidates.filter((q) => !options.excludeIds!.has(q.id));
  }

  // 错题复习模式
  if (options.reviewMode) {
    candidates = candidates.filter((q) => {
      const s = statsMap.get(q.id);
      return s && s.wrongCount > 0;
    });
  }

  if (candidates.length === 0) return null;

  const idx = weightedRandomIndex(candidates, statsMap);
  if (idx < 0) return null;

  return candidates[idx];
}

// ========== 测试用例 ==========
// const qs = [
//   { id: 'a', question: 'Q1', answer: 'A1' },
//   { id: 'b', question: 'Q2', answer: 'A2' },
// ];
// const stats = new Map<string, QuestionStats>();
// stats.set('a', { id:'a', question:'Q1', answer:'A1', correctCount:1, wrongCount:0 });
// stats.set('b', { id:'b', question:'Q2', answer:'A2', correctCount:1, wrongCount:3 });
// // b 的错误率高，应该更常被抽到
// const counts = { a: 0, b: 0 };
// for (let i = 0; i < 1000; i++) {
//   const q = selectNextQuestion(qs, stats);
//   if (q) counts[q.id as keyof typeof counts]++;
// }
// console.log('a:', counts.a, 'b:', counts.b); // b 应该明显更多
