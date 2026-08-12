/**
 * IndexedDB 封装 —— 使用 idb 库
 *
 * 数据库: vaccine-quiz-db, version 1
 * Object Store: questions (key: id)
 *   存储: { id, question, answer, correctCount, wrongCount }
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { Question, QuestionStats } from '../types';

const DB_NAME = 'vaccine-quiz-db';
const DB_VERSION = 1;
const STORE_NAME = 'questions';

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * 获取数据库实例（单例）
 */
function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 创建 object store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
          });
          // 创建索引（按错误率排序时使用）
          store.createIndex('wrongCount', 'wrongCount');
        }
      },
    });
  }
  return dbPromise;
}

/**
 * 初始化/同步题库：合并 MD 解析结果与已有统计数据
 *
 * @param questions 从 Markdown 解析出的题目列表
 */
export async function syncQuestions(
  questions: Question[],
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');

  for (const q of questions) {
    // 检查是否已存在
    const existing = await tx.store.get(q.id);
    if (!existing) {
      // 新题目 → 插入
      await tx.store.put({
        ...q,
        correctCount: 0,
        wrongCount: 0,
      });
    } else {
      // 已有 → 更新题目文本和答案（保留统计数据）
      await tx.store.put({
        ...existing,
        question: q.question,
        answer: q.answer,
      });
    }
  }

  await tx.done;
}

/**
 * 获取所有题目（含统计）
 */
export async function getAllQuestions(): Promise<QuestionStats[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

/**
 * 获取单道题的统计
 */
export async function getQuestionStats(
  id: string,
): Promise<QuestionStats | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

/**
 * 更新题目答题统计
 *
 * @param id 题目 ID
 * @param isCorrect 本次答题是否正确
 */
export async function updateQuestionStats(
  id: string,
  isCorrect: boolean,
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const record = await tx.store.get(id);

  if (record) {
    if (isCorrect) {
      record.correctCount += 1;
    } else {
      record.wrongCount += 1;
    }
    await tx.store.put(record);
  }

  await tx.done;
}

/**
 * 获取所有错题（wrongCount > 0）
 */
export async function getWrongQuestions(): Promise<QuestionStats[]> {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  return all.filter((q) => q.wrongCount > 0);
}

/**
 * 清空所有统计数据（保留题目）
 */
export async function resetStats(): Promise<void> {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  const tx = db.transaction(STORE_NAME, 'readwrite');
  for (const q of all) {
    q.correctCount = 0;
    q.wrongCount = 0;
    await tx.store.put(q);
  }
  await tx.done;
}
