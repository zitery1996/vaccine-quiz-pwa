/**
 * 中文分词工具
 *
 * 优先使用 Intl.Segmenter API（Chrome 87+, Safari 15.4+, iOS 15+）
 * Fallback: 正则按汉字/词语切分
 */

/**
 * 检测是否支持 Intl.Segmenter 中文分词
 */
function supportsSegmenter(): boolean {
  try {
    // Intl.Segmenter 基础检查
    if (typeof Intl.Segmenter !== 'function') return false;
    // 测试中文分词是否可用
    const seg = new Intl.Segmenter('zh-CN', { granularity: 'word' });
    const result = [...seg.segment('测试')];
    return result.length > 0;
  } catch {
    return false;
  }
}

/**
 * 使用 Intl.Segmenter 进行中文分词
 */
function segmentWithIntl(text: string): string[] {
  const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
  const segments = [...segmenter.segment(text)]
    .map((s) => s.segment)
    .filter((s) => s.trim().length > 0);
  return segments;
}

/**
 * 使用正则进行中文分词（Fallback）
 *
 * 策略: 把连续的汉字、字母数字、标点分别切出来
 */
function segmentWithRegex(text: string): string[] {
  // 匹配: 中文字符序列 | 英文字母/数字序列 | 非空白字符
  const tokens = text.match(/[一-鿿]+|[a-zA-Z0-9]+|[^\s]/g);
  return tokens || [];
}

/**
 * 对文本进行中文分词
 * @param text 输入文本
 * @returns 分词结果数组
 */
export function segment(text: string): string[] {
  if (supportsSegmenter()) {
    return segmentWithIntl(text);
  }
  return segmentWithRegex(text);
}

/**
 * 文本预处理: 去除标点符号、全角转半角
 * @param text 原始文本
 * @returns 规范化后的文本
 */
export function normalizeText(text: string): string {
  return (
    text
      // 全角字母数字转半角
      .replace(/[！-～]/g, (ch) =>
        String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
      )
      // 去除常见标点符号（保留中文和字母数字）
      .replace(/[，。！？、；：""''「」『』【】《》（）\s,\.!\?;:'"()\[\]{}]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}
