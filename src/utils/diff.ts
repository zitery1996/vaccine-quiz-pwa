/**
 * 答案差异比较引擎
 *
 * 流程:
 *   1. 字符级 Levenshtein 编辑距离 → 相似度
 *   2. 分词 + LCS 回溯 → 找出缺失/错误片段
 *   3. 生成 MarkToken 数组 → 用于红色高亮渲染
 */

import type { DiffResult, MarkToken } from '../types';
import { segment, normalizeText } from './segmenter';

// ========== 1. 编辑距离 (Levenshtein) ==========

/**
 * 计算两个字符串的 Levenshtein 编辑距离
 *
 * 算法: 动态规划 O(m×n)
 * dp[i][j] = a[0..i-1] 与 b[0..j-1] 的最小编辑距离
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // 用滚动数组优化空间: 只需要两行
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);

  // 初始化第一行: 空串 → b 需要 n 次插入
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i; // a → 空串需要 i 次删除
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1]; // 字符相同，不需要操作
      } else {
        curr[j] =
          1 +
          Math.min(
            prev[j],     // 删除 a[i-1]
            curr[j - 1], // 插入 b[j-1]
            prev[j - 1], // 替换
          );
      }
    }
    [prev, curr] = [curr, prev]; // 交换引用
  }

  return prev[n];
}

// ========== 2. 最长公共子序列 (LCS) ==========

/**
 * LCS 回溯: 根据 dp 表找出实际的对齐操作
 *
 * 返回值: operations 数组
 *   'match'      - 标准词与用户词匹配
 *   'missing'    - 标准词在用户答案中缺失
 *   'error'      - 标准词与用户词不匹配（替换）
 *   'extra'      - 用户多说的词
 *
 * 使用 Hirshberg 风格的回溯，基于词级编辑距离 dp 表
 */
interface AlignOp {
  type: 'match' | 'missing' | 'error' | 'extra';
  /** 标准答案中的词（missing/error/match 时有值） */
  correctWord?: string;
  /** 用户答案中的词（error/extra/match 时有值） */
  userWord?: string;
}

function backtrackAlignment(
  correctWords: string[],
  userWords: string[],
): AlignOp[] {
  const m = correctWords.length;
  const n = userWords.length;

  // 构建完整的 dp 表 (词级编辑距离)
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (correctWords[i - 1] === userWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] =
          1 +
          Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  // 回溯
  const ops: AlignOp[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && correctWords[i - 1] === userWords[j - 1]) {
      // 匹配
      ops.unshift({
        type: 'match',
        correctWord: correctWords[i - 1],
        userWord: userWords[j - 1],
      });
      i--;
      j--;
    } else if (
      i > 0 &&
      j > 0 &&
      dp[i][j] === dp[i - 1][j - 1] + 1
    ) {
      // 替换 → 标准词标记为 missing，用户词标记为 error
      // 先记录 error（用户端），再记录 missing（标准端）
      ops.unshift({
        type: 'error',
        correctWord: correctWords[i - 1],
        userWord: userWords[j - 1],
      });
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      // 删除 → 标准词缺失
      ops.unshift({
        type: 'missing',
        correctWord: correctWords[i - 1],
      });
      i--;
    } else if (j > 0) {
      // 插入 → 用户多说的词
      ops.unshift({
        type: 'extra',
        userWord: userWords[j - 1],
      });
      j--;
    }
  }

  return ops;
}

// ========== 3. 标记生成 ==========

/**
 * 将回溯操作转换为用于渲染的 MarkToken 数组
 */
function opsToTokens(
  ops: AlignOp[],
): { markedAnswer: MarkToken[]; markedUserAnswer: MarkToken[] } {
  const markedAnswer: MarkToken[] = [];
  const markedUserAnswer: MarkToken[] = [];

  for (const op of ops) {
    switch (op.type) {
      case 'match':
        if (op.correctWord) {
          markedAnswer.push({ text: op.correctWord, type: 'correct' });
        }
        if (op.userWord) {
          markedUserAnswer.push({ text: op.userWord, type: 'correct' });
        }
        break;

      case 'missing':
        if (op.correctWord) {
          markedAnswer.push({ text: op.correctWord, type: 'missing' });
        }
        break;

      case 'error':
        if (op.correctWord) {
          markedAnswer.push({ text: op.correctWord, type: 'missing' });
        }
        if (op.userWord) {
          markedUserAnswer.push({ text: op.userWord, type: 'error' });
        }
        break;

      case 'extra':
        if (op.userWord) {
          markedUserAnswer.push({ text: op.userWord, type: 'error' });
        }
        break;
    }
  }

  return { markedAnswer, markedUserAnswer };
}

// ========== 4. 主入口 ==========

/**
 * 比较用户答案与标准答案
 *
 * @param userAnswer 用户的口语回答文本
 * @param standardAnswer 标准答案
 * @returns DiffResult 包含相似度、判定结果、标记数组
 */
export function compareAnswers(
  userAnswer: string,
  standardAnswer: string,
): DiffResult {
  // Step 1: 文本规范化
  const normalizedUser = normalizeText(userAnswer);
  const normalizedStandard = normalizeText(standardAnswer);

  // Step 2: 字符级编辑距离 → 相似度
  const dist = levenshteinDistance(normalizedUser, normalizedStandard);
  const maxLen = Math.max(
    normalizedUser.length,
    normalizedStandard.length,
  );
  const similarity =
    maxLen === 0 ? 1 : Math.max(0, 1 - dist / maxLen);

  // Step 3: 判定 (>= 0.8 正确)
  const isCorrect = similarity >= 0.8;

  // Step 4: 分词
  const userWords = segment(normalizedUser);
  const correctWords = segment(normalizedStandard);

  // Step 5: LCS 回溯 + 标记生成
  const ops = backtrackAlignment(correctWords, userWords);
  const { markedAnswer, markedUserAnswer } = opsToTokens(ops);

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
// import { compareAnswers, levenshteinDistance } from './diff';
//
// // 测试编辑距离
// console.log(levenshteinDistance('乙肝疫苗', '乙肝疫苗'));  // 0
// console.log(levenshteinDistance('乙肝疫苗', '甲肝疫苗'));  // 1
//
// // 测试完整比较
// const r = compareAnswers(
//   '乙肝疫苗需要接种三针按照零一六个月程序',
//   '乙肝疫苗通常需要接种3针，按照0、1、6个月的程序进行。'
// );
// console.log('相似度:', r.similarity);
// console.log('是否正确:', r.isCorrect);
// console.log('标准答案标记:', r.markedAnswer);
// console.log('用户答案标记:', r.markedUserAnswer);
