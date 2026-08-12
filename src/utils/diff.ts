/**
 * 答案差异比较引擎（顺序无关版）
 *
 * 设计思路：
 *   背诵时句子顺序可能颠倒（先背后面一句、再背前面一句），
 *   因此不再用 LCS 顺序对齐，改为"内容覆盖匹配"：
 *
 *   1. 分词后做多重集（bag-of-words）匹配 —— 标准答案里的词只要
 *      在用户回答里出现（不管顺序），就算"覆盖到"。
 *   2. 相似度 = 被覆盖的标准词长度 / 标准答案总词长度
 *      （按字符长度加权，重要内容词贡献更大）
 *   3. 未被覆盖的标准词 → 标红（缺漏）；用户多说的词 → 标红（错误）
 *
 * 优点：顺序颠倒不影响评分，只要内容背全了就算对。
 */

import type { DiffResult, MarkToken } from '../types';
import { segment, normalizeText } from './segmenter';

// ========== 1. 编辑距离 (Levenshtein) —— 保留工具函数 ==========

/**
 * 计算两个字符串的 Levenshtein 编辑距离（顺序敏感，仅供对比参考）
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] =
          1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

// ========== 2. 多重集内容覆盖匹配（顺序无关） ==========

/**
 * 对标准答案词和用户词做多重集匹配，判断哪些词被覆盖
 *
 * 算法：
 *   1. 统计标准答案每个词的出现次数（multiset）
 *   2. 遍历用户词，若标准 multiset 里还有该词，则匹配一个
 *   3. 返回每个位置是否被匹配
 *
 * 与 LCS 的区别：完全忽略顺序，只看"这个词有没有背到"
 */
function tokenCoverage(
  correctTokens: string[],
  userTokens: string[],
): { matchedCorrect: boolean[]; matchedUser: boolean[] } {
  // 标准答案词频
  const correctCounts = new Map<string, number>();
  for (const t of correctTokens) {
    correctCounts.set(t, (correctCounts.get(t) ?? 0) + 1);
  }

  const matchedCorrect = new Array(correctTokens.length).fill(false);
  const matchedUser = new Array(userTokens.length).fill(false);

  // 遍历用户词，贪心匹配到标准答案里尚未用掉的相同词
  for (let i = 0; i < userTokens.length; i++) {
    const t = userTokens[i];
    const available = correctCounts.get(t) ?? 0;
    if (available <= 0) continue; // 标准答案里没有这个词 → 用户多说的

    // 找到第一个未匹配的相同标准词
    for (let j = 0; j < correctTokens.length; j++) {
      if (correctTokens[j] === t && !matchedCorrect[j]) {
        matchedCorrect[j] = true;
        matchedUser[i] = true;
        break;
      }
    }
    correctCounts.set(t, available - 1);
  }

  return { matchedCorrect, matchedUser };
}

// ========== 3. 标记生成 ==========

/**
 * 根据匹配结果生成 MarkToken，并合并相邻同类型 token 使显示更清爽
 */
function buildTokens(
  tokens: string[],
  matched: boolean[],
  matchedType: 'correct' | 'error' | 'missing',
  unmatchedType: 'correct' | 'error' | 'missing',
): MarkToken[] {
  const result: MarkToken[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const type = matched[i] ? matchedType : unmatchedType;
    const text = tokens[i];

    // 与前一个 token 同类型则合并
    const last = result[result.length - 1];
    if (last && last.type === type) {
      last.text += text;
    } else {
      result.push({ text, type });
    }
  }

  return result;
}

// ========== 4. 主入口 ==========

/**
 * 比较用户答案与标准答案（顺序无关）
 *
 * @param userAnswer 用户的口语回答文本
 * @param standardAnswer 标准答案
 * @returns DiffResult 包含相似度、判定结果、标记数组
 */
export function compareAnswers(
  userAnswer: string,
  standardAnswer: string,
): DiffResult {
  // Step 1: 文本规范化（去标点、全角转半角）
  const normalizedUser = normalizeText(userAnswer);
  const normalizedStandard = normalizeText(standardAnswer);

  // Step 2: 分词
  const userWords = segment(normalizedUser);
  const correctWords = segment(normalizedStandard);

  // Step 3: 多重集内容覆盖匹配（忽略顺序）
  const { matchedCorrect, matchedUser } = tokenCoverage(
    correctWords,
    userWords,
  );

  // Step 4: 计算覆盖相似度（按字符长度加权）
  let matchedLength = 0;
  let totalLength = 0;
  for (let i = 0; i < correctWords.length; i++) {
    totalLength += correctWords[i].length;
    if (matchedCorrect[i]) matchedLength += correctWords[i].length;
  }
  const similarity =
    totalLength === 0 ? 1 : Math.max(0, matchedLength / totalLength);

  // Step 5: 判定 (>= 0.8 正确)
  const isCorrect = similarity >= 0.8;

  // Step 6: 生成标记
  const markedAnswer = buildTokens(
    correctWords,
    matchedCorrect,
    'correct',
    'missing',
  );
  const markedUserAnswer = buildTokens(
    userWords,
    matchedUser,
    'correct',
    'error',
  );

  return {
    similarity,
    isCorrect,
    markedAnswer,
    markedUserAnswer,
  };
}

// ========== 测试用例 ==========
// 可在浏览器 console 中验证:
//
// import { compareAnswers } from './diff';
//
// // 顺序颠倒应判为正确（内容覆盖完整）
// const r1 = compareAnswers(
//   '按照0、1、6个月的程序进行，乙肝疫苗通常需要接种3针',
//   '乙肝疫苗通常需要接种3针，按照0、1、6个月的程序进行'
// );
// console.log('顺序颠倒相似度:', r1.similarity.toFixed(2), r1.isCorrect);
// // 期望: 相似度接近 1.0，isCorrect = true
//
// // 漏答一部分应判为错误
// const r2 = compareAnswers(
//   '乙肝疫苗需要接种3针',  // 漏了 0、1、6 个月程序
//   '乙肝疫苗通常需要接种3针，按照0、1、6个月的程序进行'
// );
// console.log('漏答相似度:', r2.similarity.toFixed(2), r2.isCorrect);
