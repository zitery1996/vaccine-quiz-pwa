/**
 * PWA 安装引导组件
 *
 * - iOS Safari: 引导用户点击"分享 → 添加到主屏幕"
 * - Android Chrome: 显示原生安装提示
 * - 其他平台: 不显示
 */

import { useState, useEffect } from 'react';

/** Android Chrome beforeinstallprompt 事件类型 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// 检测是否为 iOS Safari
function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua);
  return isIOS && isSafari;
}

// 检测是否已在独立模式（已安装 PWA）
function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches;
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // 已安装则不显示
    if (isStandalone()) return;

    // Android Chrome: 监听 beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // iOS Safari: 直接显示引导
    if (isIOSSafari() && !deferredPrompt) {
      // 延迟显示，避免刚打开就弹
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setVisible(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="install-banner">
      <span>
        {deferredPrompt
          ? '📲 添加到主屏幕，随时练习'
          : '📲 点击下方分享按钮 → "添加到主屏幕"'}
      </span>
      {deferredPrompt ? (
        <>
          <button onClick={handleInstall}>安装</button>
          <button
            onClick={handleDismiss}
            style={{
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: '1.2rem',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </>
      ) : (
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            fontSize: '1.2rem',
            padding: '4px 8px',
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
