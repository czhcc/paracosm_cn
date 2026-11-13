/**
 * GuidedTour — Scrimless walkthrough of the Paracosm dashboard.
 *
 * Highlights the target element with a pulsing amber outline.
 * No dark overlay — the full UI stays visible and alive.
 * A floating card annotates each highlighted section.
 */

import { useState, useEffect, useCallback, useMemo, useRef, type CSSProperties } from 'react';
import styles from './GuidedTour.module.scss';

export type TourTab = 'quickstart' | 'studio' | 'sim' | 'viz' | 'chat' | 'reports' | 'library' | 'settings';

export interface TourStep {
  target: string;
  tab: TourTab;
  title: string;
  description: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-quickstart-seed]',
    tab: 'quickstart',
    title: "快速开始 — 从描述创建场景",
    description: "粘贴描述、拖入 PDF 或提供网页链接。Paracosm 将结合网络研究，生成具有 HEXACO 人格的不同决策者，在同一场景中并行运行。下方数字孪生卡片可对单个对象执行单项干预。",
  },
  {
    target: '[role="tablist"][aria-label="工作室子导航"]',
    tab: 'studio',
    title: "工作室 — 编写与分支",
    description: "拖入已保存的运行记录或运行组，即可查看、创建分支和重新运行。分支页可从任一回合的检查点出发，替换 HEXACO 人格，探索不同决策带来的后续演变。",
  },
  {
    target: '.topbar',
    tab: 'sim',
    title: "顶部工具栏",
    description: "左侧显示场景名称，右侧提供运行、连接状态、主题切换和工作原理导览。中间显示回合、仿真时间与随机种子，悬停可查看说明。运行开始后可在 ⋯ 菜单中保存、复制和清除数据。",
  },
  {
    target: '.tab-bar',
    tab: 'sim',
    title: "页面导航",
    description: "快速开始与工作室用于创建场景；仿真、可视化与聊天用于观察运行；报告与资料库用于分析。设置页包含配置和事件日志。窄屏下标签收为图标，避免导航换行。",
  },
  {
    target: '[role="group"][aria-label="仿真布局"]',
    tab: 'sim',
    title: "仿真布局",
    description: "双人场景可并排显示，多人场景可使用星座布局。点击星座中的节点可查看对应决策者的决策、部门和工具。此导览使用并排布局展示双人运行的卡片与事件流。",
  },
  {
    target: '.leaders-row',
    tab: 'sim',
    title: "决策者卡片",
    description: "每位决策者显示姓名、人格类型、HEXACO 参数，以及人口与士气迷你图。左侧使用琥珀色，右侧使用青色；后续符号、网格与事件标签沿用对应颜色，帮助辨认时间线。",
  },
  {
    target: '.sim-columns',
    tab: 'sim',
    title: "事件流",
    description: "每回合，事件导演根据累计状态生成事件。各部门并行分析，必要时创建工具，随后由决策者作出决定。工具卡上的日志入口可打开已按该工具筛选的事件日志。",
  },
  {
    target: '[aria-label="逐回合分歧图"]',
    tab: 'sim',
    title: "分歧对比",
    description: "并排展示当前回合的决策与结果，观察不同决策者的分歧。相同起点和随机种子下，HEXACO 人格会影响模型调用，从而产生不同的演变路径。",
  },
  {
    target: '.viz-content',
    tab: 'viz',
    title: "可视化 — 群体画布",
    description: "每位决策者拥有独立画布。底层元胞图案编码情绪，上层人员符号展示个体。悬停可查看提示，点击可打开成员详情。上方可切换存活、情绪、工具创建、生态和分歧模式，并按事件筛选。",
  },
  {
    target: '.chat-layout',
    tab: 'chat',
    title: "角色聊天",
    description: "可与运行中的居民聊天。每人都带有 HEXACO 人格、仿真经历、记忆与关系。可视化详情中的聊天入口会直接选中对应成员。",
  },
  {
    target: '.reports-content',
    tab: 'reports',
    title: "报告",
    description: "逐回合汇总决策、部门分析、动态工具、成员反应和最终结论。工具上的日志入口会跳转到该工具的创建与使用历史。",
  },
  {
    target: '[role="group"][aria-label="显示方式"]',
    tab: 'library',
    title: "资料库 — 已保存运行",
    description: "已启动的运行保存在此处，可按场景、决策者配置或文字筛选。画廊展示关键指标，表格展示详细记录。打开运行可查看详情，也可送入工作室创建分支。",
  },
  {
    target: '[role="tablist"][aria-label="设置子导航"]',
    tab: 'settings',
    title: "设置与事件日志",
    description: "使用 HEXACO 滑块配置决策者，选择场景、回合与人口，并填写模型服务密钥。事件日志展示状态、回合、部门分析、决策、结果、反应和工具创建等原始事件，是各处日志入口的目标。",
  },
  {
    target: '.topbar',
    tab: 'sim',
    title: "准备开始",
    description: "以上使用演示数据。点击顶部运行按钮启动实际仿真，也可先在设置中填写自己的 API 密钥。运行结束后，顶部会显示结论横幅，并提供报告入口。",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const CARD_W = 360;
const HIGHLIGHT_CLASS = 'tour-highlight';

const TOUR_STYLES = `
/* The highlighted element gets a bright luminous amber glow */
.${HIGHLIGHT_CLASS} {
  outline: 3px solid var(--amber) !important;
  outline-offset: 8px !important;
  box-shadow:
    0 0 20px rgba(232,180,74,.7),
    0 0 50px rgba(232,180,74,.4),
    0 0 100px rgba(232,180,74,.2),
    inset 0 0 30px rgba(232,180,74,.08) !important;
  position: relative !important;
  z-index: 99998 !important;
  filter: brightness(1.15) !important;
  animation: tour-pulse 2s ease-in-out infinite !important;
}
@keyframes tour-pulse {
  0%, 100% {
    outline-color: var(--amber);
    box-shadow: 0 0 20px rgba(232,180,74,.7), 0 0 50px rgba(232,180,74,.4), 0 0 100px rgba(232,180,74,.2), inset 0 0 30px rgba(232,180,74,.08);
  }
  50% {
    outline-color: rgba(232,180,74,1);
    box-shadow: 0 0 30px rgba(232,180,74,.9), 0 0 70px rgba(232,180,74,.55), 0 0 120px rgba(232,180,74,.3), inset 0 0 40px rgba(232,180,74,.12);
  }
}
`;

interface GuidedTourProps {
  /** The dashboard's currently-active tab. Threaded in so the tour can
   *  defer its DOM lookup until React has actually committed the tab
   *  change requested by onTabChange — without this, the lookup races
   *  ahead of the new tab's mount on slow viewports and lands on either
   *  the previous tab's elements or a stale empty container. */
  activeTab: TourTab | string;
  /** Whether the active scenario exposes Character Chat. When false the
   *  TabBar hides the Chat tab entirely; the tour drops its Chat step
   *  to match so it doesn't navigate to a tab the user can't reach
   *  via any other path. */
  chatEnabled?: boolean;
  onTabChange: (tab: TourTab) => void;
  onClose: () => void;
  onRun?: () => void;
}

export function GuidedTour({ activeTab, chatEnabled = true, onTabChange, onClose, onRun }: GuidedTourProps) {
  // Drop the Chat step on scenarios where Character Chat is disabled.
  // Without this filter the tour would fire onTabChange('chat') and the
  // ChatPanel (always mounted but hidden) would surface a tab the user
  // has no other way to reach.
  const steps = useMemo(
    () => (chatEnabled ? TOUR_STEPS : TOUR_STEPS.filter(s => s.tab !== 'chat')),
    [chatEnabled],
  );
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  // Re-render the card layout when the viewport crosses the mobile
  // breakpoint (e.g. user rotates device). The measure() resize handler
  // already re-positions the highlight; this state ensures the card's
  // mobile/desktop branch also flips on the same boundary.
  const [viewportW, setViewportW] = useState(() => (typeof window === 'undefined' ? 1024 : window.innerWidth));
  const prevElRef = useRef<Element | null>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const rafRef = useRef(0);
  const current = steps[step];

  // Inject tour styles on mount, remove on unmount
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = TOUR_STYLES;
    document.head.appendChild(style);
    styleRef.current = style;
    return () => {
      style.remove();
      document.querySelector(`.${HIGHLIGHT_CLASS}`)?.classList.remove(HIGHLIGHT_CLASS);
    };
  }, []);

  // Drive the tab change as a separate effect so it fires the moment
  // step changes, independent of any other dep. Earlier this was bundled
  // into measure() and the lookup race, which left a window where the
  // user could observe a step that hadn't yet pushed its onTabChange
  // through to App.activeTab — making the URL bar lag behind the tour
  // card's "VIZ" / "STUDIO" / etc. badge.
  useEffect(() => {
    const s = steps[step];
    if (s) onTabChange(s.tab);
  }, [step, onTabChange, steps]);

  // Auto-dismiss when the user manually navigates to a tab the current
  // step doesn't target. Without this, clicking VIZ while parked on
  // (e.g.) the quickstart step leaves the viewport-wide SVG scrim
  // painted on a tab where the highlight target doesn't exist — the
  // user sees a permanent dim wash with no card and no obvious
  // dismissal affordance. Short delay lets tour-driven onTabChange
  // settle before we judge "mismatched" (without it the step-change
  // effect above briefly desyncs activeTab and aborts the tour
  // mid-progression).
  useEffect(() => {
    const s = steps[step];
    if (!s || s.tab === activeTab) return;
    const t = setTimeout(() => {
      const stillMismatched = steps[step]?.tab !== activeTab;
      if (stillMismatched) onClose();
    }, 200);
    return () => clearTimeout(t);
  }, [activeTab, step, steps, onClose]);

  // Highlight target element and measure its rect.
  const attemptCancelRef = useRef<(() => void) | null>(null);
  const measure = useCallback(() => {
    const s = steps[step];
    if (!s) return;

    attemptCancelRef.current?.();

    // Strip the previous step's highlight IMMEDIATELY so the new step
    // never renders its title/copy with the previous step's element
    // glowing. The polling loop below can take 100-3000ms to find a
    // target on a slow or off-tab mount; without this clear the user
    // sees "Divergence rail" in the tour card while "Event streams"
    // (the prior step's target) still glows. Same desync also showed
    // up when the user hit Back from the next step — the prior new
    // highlight stuck around because apply() only swaps when the new
    // target is found.
    if (prevElRef.current) {
      prevElRef.current.classList.remove(HIGHLIGHT_CLASS);
      prevElRef.current = null;
    }
    setRect(null);

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      let cancelled = false;
      let pollHandle: number | undefined;
      let observer: MutationObserver | undefined;
      const apply = (el: Element) => {
        if (cancelled) return;
        cancelled = true;
        if (pollHandle !== undefined) clearTimeout(pollHandle);
        observer?.disconnect();
        if (prevElRef.current && prevElRef.current !== el) {
          prevElRef.current.classList.remove(HIGHLIGHT_CLASS);
        }
        el.classList.add(HIGHLIGHT_CLASS);
        prevElRef.current = el;
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        if (r.top < 0 || r.bottom > window.innerHeight) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      };
      let attempt = 0;
      const MAX_ATTEMPTS = 30;
      const POLL_MS = 100;
      const tryFind = () => {
        if (cancelled) return;
        const el = document.querySelector(s.target);
        if (el) {
          apply(el);
          return;
        }
        if (++attempt < MAX_ATTEMPTS) {
          pollHandle = window.setTimeout(tryFind, POLL_MS);
        } else if (!cancelled) {
          cancelled = true;
          observer?.disconnect();
          if (prevElRef.current) {
            prevElRef.current.classList.remove(HIGHLIGHT_CLASS);
            prevElRef.current = null;
          }
          setRect(null);
        }
      };
      observer = new MutationObserver(() => {
        if (cancelled) return;
        const el = document.querySelector(s.target);
        if (el) apply(el);
      });
      observer.observe(document.body, { childList: true, subtree: true });
      tryFind();
      attemptCancelRef.current = () => {
        cancelled = true;
        if (pollHandle !== undefined) clearTimeout(pollHandle);
        observer?.disconnect();
      };
    });
  }, [step, steps]);

  useEffect(() => {
    measure();
    let resizeRaf = 0;
    const h = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        setViewportW(window.innerWidth);
        measure();
      });
    };
    window.addEventListener('resize', h);
    return () => {
      window.removeEventListener('resize', h);
      cancelAnimationFrame(resizeRaf);
      cancelAnimationFrame(rafRef.current);
    };
  }, [measure, activeTab]);

  const handleClose = useCallback(() => {
    if (prevElRef.current) {
      prevElRef.current.classList.remove(HIGHLIGHT_CLASS);
      prevElRef.current = null;
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        step < steps.length - 1 ? setStep(s => s + 1) : handleClose();
      } else if (e.key === 'ArrowLeft' && step > 0) setStep(s => s - 1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [step, handleClose, steps.length]);

  if (!current) return null;

  const vw = viewportW;
  const vh = typeof window === 'undefined' ? 768 : window.innerHeight;
  const isMobile = vw < 640;

  // Compute card position via CSS custom properties so the static styles
  // live in the SCSS module while runtime values flow through inline.
  // Threshold reflects the real card footprint, not just header chrome:
  // step 1 ("Quickstart — author from a brief") plus the 14-step
  // counter + tab badge + Skip/Next action row lands around 280px on
  // desktop, so a 200px "below" check happily placed the card in a
  // slot it could never fit. The card itself is also max-heighted +
  // overflow-y: auto in the SCSS so even worst-case anchors keep the
  // controls reachable, but biasing toward "above" / "right" first
  // avoids the awkward inner scroll on the most common targets.
  const CARD_MIN_VERTICAL_SLOT = 320;
  const cardVars: CSSProperties = {};
  if (!isMobile && rect) {
    const below = vh - (rect.top + rect.height + 10);
    const above = rect.top - 10;
    const right = vw - (rect.left + rect.width + 10);

    if (below >= CARD_MIN_VERTICAL_SLOT) {
      (cardVars as Record<string, string>)['--card-top'] = `${rect.top + rect.height + 16}px`;
      (cardVars as Record<string, string>)['--card-left'] = `${Math.max(16, Math.min(rect.left, vw - CARD_W - 16))}px`;
    } else if (above >= CARD_MIN_VERTICAL_SLOT) {
      (cardVars as Record<string, string>)['--card-bottom'] = `${vh - rect.top + 16}px`;
      (cardVars as Record<string, string>)['--card-left'] = `${Math.max(16, Math.min(rect.left, vw - CARD_W - 16))}px`;
    } else if (right >= CARD_W + 24) {
      (cardVars as Record<string, string>)['--card-left'] = `${rect.left + rect.width + 16}px`;
      (cardVars as Record<string, string>)['--card-top'] = `${Math.max(16, Math.min(rect.top, vh - CARD_MIN_VERTICAL_SLOT - 16))}px`;
    } else {
      (cardVars as Record<string, string>)['--card-bottom'] = '24px';
      (cardVars as Record<string, string>)['--card-right'] = '24px';
    }
  } else if (!isMobile) {
    (cardVars as Record<string, string>)['--card-bottom'] = '24px';
    (cardVars as Record<string, string>)['--card-right'] = '24px';
  }

  const pad = 10;
  const cardCls = [styles.card, isMobile ? styles.mobile : ''].filter(Boolean).join(' ');

  return (
    <>
      {/* Scrimless tour per the file header intent — no SVG dim overlay,
       * no full-viewport click-away. The pulsing amber outline on the
       * highlighted element carries the focus signal; the tour card
       * itself stays interactive with X / ESC / arrow keys for
       * dismissal and navigation. The full page stays clickable
       * underneath, so navigating away mid-tour just works. */}

      {/* Tour card */}
      <div data-tour-overlay className={cardCls} style={cardVars} onClick={e => e.stopPropagation()} role="dialog" aria-label="操作导览">
        <div className={styles.cardHeader}>
          <span className={styles.stepCount}>
            {step + 1} / {steps.length}
          </span>
          <span aria-label="当前页面" className={styles.tabBadge}>
            {({ quickstart: '快速开始', studio: '工作室', sim: '仿真', viz: '可视化', chat: '聊天', reports: '报告', library: '资料库', settings: '设置' })[current.tab]}
          </span>
          <button onClick={handleClose} className={styles.closeBtn} aria-label="关闭导览">&times;</button>
        </div>

        <h3 className={[styles.title, isMobile ? styles.mobile : ''].filter(Boolean).join(' ')}>
          {current.title}
        </h3>
        <p className={[styles.description, isMobile ? styles.mobile : ''].filter(Boolean).join(' ')}>
          {current.description}
        </p>

        <div className={styles.actions}>
          <button onClick={handleClose} className={[styles.skipBtn, isMobile ? styles.compact : ''].filter(Boolean).join(' ')}>跳过</button>
          <div className={styles.actionsRight}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className={[styles.navBtn, isMobile ? styles.compact : ''].filter(Boolean).join(' ')}>
                返回
              </button>
            )}
            <button
              onClick={() => {
                if (step < steps.length - 1) {
                  setStep(s => s + 1);
                } else {
                  handleClose();
                  onRun?.();
                }
              }}
              className={[
                styles.primaryBtn,
                isMobile ? styles.compact : '',
                !isMobile && step === steps.length - 1 ? styles.final : '',
              ].filter(Boolean).join(' ')}
            >
              {step < steps.length - 1 ? '下一步' : isMobile ? '开始 →' : '开始仿真'}
            </button>
          </div>
        </div>

        {/* Thin progress bar (mobile) or dot row (desktop). */}
        {isMobile ? (
          <div className={styles.progressBar}>
            <div
              className={styles.progressBarFill}
              style={{ '--progress-pct': `${((step + 1) / steps.length) * 100}%` } as CSSProperties}
              role="progressbar"
              aria-valuenow={step + 1}
              aria-valuemin={1}
              aria-valuemax={steps.length}
              aria-label={`第 ${step + 1} / ${steps.length} 步`}
            />
          </div>
        ) : (
          <div className={styles.dotRow}>
            {steps.map((_, i) => (
              <button
                key={i} onClick={() => setStep(i)}
                className={styles.dot}
                style={{
                  '--dot-width': i === step ? '16px' : '6px',
                  '--dot-bg': i === step ? 'var(--amber)' : i < step ? 'var(--text-3)' : 'var(--border)',
                } as CSSProperties}
                aria-label={`第 ${i + 1} 步`}
              />
            ))}
          </div>
        )}

        {!isMobile && (
          <div className={styles.kbHint}>方向键 / Esc</div>
        )}
      </div>
    </>
  );
}
