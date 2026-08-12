/**
 * Markdown 题库解析器 —— 简单编号格式
 *
 * 格式:
 *   1.乙肝疫苗              ← 题目（数字.标题）
 *   (1)常规程序...           ← 答案内容
 *   ...
 *
 *   2.乙肝疫苗补种原则       ← 下一题
 *   ...
 *
 * 规则:
 *   - 以"数字."或"数字、"开头的行 → 题目
 *   - 【】包裹的行 → 跳过分组标签
 *   - 其余非空行 → 当前题目的答案
 */

import type { Question } from '../types';

function hash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return 'q' + Math.abs(h).toString(36);
}

/** 判断一行是否为题目标题（数字.xxx 或 数字、xxx） */
function isQuestionLine(line: string): boolean {
  return /^\d+[.、]\s*\S/.test(line);
}

/** 判断一行是否为分组标签（【xxx】） */
function isCategoryHeader(line: string): boolean {
  return /^【[^】]+】\s*$/.test(line);
}

export function parseQuestions(md: string): Question[] {
  const questions: Question[] = [];
  const lines = md.split(/\r?\n/);

  let currentQuestion = '';
  let currentAnswerLines: string[] = [];

  function flush() {
    const q = currentQuestion.trim();
    const a = currentAnswerLines
      .join('\n')
      .replace(/\s+/g, ' ')
      .trim();
    if (q && a) {
      questions.push({ id: hash(q), question: q, answer: a });
    }
    currentAnswerLines = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 分组标签 → 跳过
    if (isCategoryHeader(trimmed)) continue;

    // 题目标题 → 保存上一题，开始新题
    if (isQuestionLine(trimmed)) {
      flush();
      currentQuestion = trimmed;
    } else {
      // 答案内容
      currentAnswerLines.push(trimmed);
    }
  }

  // 最后一题
  flush();

  return questions;
}

export function validateQuestions(questions: Question[]): string[] {
  const errors: string[] = [];
  if (questions.length === 0) {
    errors.push('题库为空，请检查格式。题目应以"数字."开头。');
  }
  const seen = new Set<string>();
  for (const q of questions) {
    if (seen.has(q.id)) {
      errors.push(`题目重复: "${q.question.slice(0, 30)}..."`);
    }
    seen.add(q.id);
    if (q.answer.length < 5) {
      errors.push(`答案过短: "${q.question.slice(0, 30)}..." (${q.answer.length}字)`);
    }
  }
  return errors;
}
