/** 题库中的单道题目 */
export interface Question {
  /** 唯一标识，由题目文本 hash 生成 */
  id: string;
  /** 题目文字 */
  question: string;
  /** 标准答案全文 */
  answer: string;
}

/** IndexedDB 中存储的题目统计 */
export interface QuestionStats {
  id: string;
  question: string;
  answer: string;
  correctCount: number;
  wrongCount: number;
}

/** 分词标记 —— 用于差异展示 */
export interface MarkToken {
  text: string;
  type: 'correct' | 'missing' | 'error';
}

/** 差异比较结果 */
export interface DiffResult {
  /** 相似度 0-1 */
  similarity: number;
  /** 是否正确 (>= 0.8) */
  isCorrect: boolean;
  /** 带标记的标准答案 token 列表 */
  markedAnswer: MarkToken[];
  /** 带标记的用户答案 token 列表 */
  markedUserAnswer: MarkToken[];
}

/** 语音识别状态 */
export type SpeechStatus = 'idle' | 'listening' | 'stopped' | 'error' | 'unsupported';

/** 应用页面 */
export type Page = 'quiz' | 'stats';
