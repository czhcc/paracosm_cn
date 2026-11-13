/**
 * InterventionDemoCard renders the editable Subject + Intervention form
 * that drives the digital-twin run on the Quickstart input phase. The
 * form starts empty and the user fills in any subject (patient, market,
 * jurisdiction, vehicle, ...) plus any intervention (treatment, launch,
 * ordinance, mission profile, ...). Three preset buttons (medical,
 * policy, product) load example payloads for users who want a starting
 * point.
 *
 * Click hits POST /api/quickstart/simulate-intervention with the
 * dynamically-built SubjectConfig + InterventionConfig and a run key the
 * card mints, which the parent (App.tsx) follows on the event stream, so
 * the page tells its own run from any other. On 200 the artifact is
 * forwarded to the parent, which parks it and switches to the SIM tab so
 * DigitalTwinPanel renders the result.
 *
 * @module paracosm/dashboard/digital-twin/InterventionDemoCard
 */
import { useState } from 'react';
import type { RunArtifact } from '../../../../engine/schema/index.js';
import styles from './InterventionDemoCard.module.scss';
import { emitLaunched } from '../../scenario-sync';

export interface InterventionDemoCardProps {
  /** The run's artifact, with the key the run was started under. */
  onResult: (artifact: RunArtifact, runKey: string) => void;
  onError?: (message: string, runKey: string) => void;
  onRunStart?: (payload: {
    /** The key the run opens with on the event stream. */
    runKey: string;
    subject: { id: string; name: string; profile?: Record<string, unknown> };
    intervention: { id: string; name: string; description: string; duration?: { value: number; unit: string } };
  }) => void | Promise<void>;
}

interface SubjectForm {
  id: string;
  name: string;
  description: string;
  profileJson: string;
}

interface InterventionForm {
  id: string;
  name: string;
  description: string;
  durationValue: string;
  durationUnit: string;
  adherence: string;
}

interface Preset {
  label: string;
  blurb: string;
  subject: SubjectForm;
  intervention: InterventionForm;
  signalsJson: string;
}

const EMPTY_SUBJECT: SubjectForm = {
  id: '',
  name: '',
  description: '',
  profileJson: '{}',
};

const EMPTY_INTERVENTION: InterventionForm = {
  id: '',
  name: '',
  description: '',
  durationValue: '12',
  durationUnit: 'weeks',
  adherence: '0.85',
};

const PRESETS: Record<string, Preset> = {
  medical: {
    label: "患者 · 治疗",
    blurb: "2 型糖尿病患者接受 12 周司美格鲁肽与生活方式干预。",
    subject: {
      id: 'patient-maria-2026',
      name: "陈玛丽",
      description: "58 岁，2 型糖尿病病程 4 年，久坐，有心血管病家族史，正在使用二甲双胍。",
      profileJson: JSON.stringify({
        age: 58,
        yearsWithT2D: 4,
        bmi: 31,
        a1cBaseline: 7.8,
        weightLb: 178,
        fastingGlucose: 156,
        sleepHoursBaseline: 6.2,
        exerciseMinPerWeek: 0,
        comorbidities: "高血压、血脂异常",
      }, null, 2),
    },
    intervention: {
      id: 'glp1-12wk-protocol',
      name: "12 周司美格鲁肽与生活方式干预方案",
      description: "每周使用司美格鲁肽 0.25mg，第 4 周前增至 1.0mg。配合营养师指导的饮食计划与每周 150 分钟分级运动，每两周进行行为健康评估，监测胃肠道不良反应、胆囊问题和胰腺炎。",
      durationValue: '84',
      durationUnit: 'days',
      adherence: '0.85',
    },
    signalsJson: JSON.stringify([
      { label: 'HbA1c', value: 7.8, unit: '%', recordedAt: '2026-09-15T00:00:00Z' },
      { label: "空腹血糖", value: 156, unit: 'mg/dL', recordedAt: '2026-09-15T00:00:00Z' },
      { label: "体重", value: 178, unit: 'lb', recordedAt: '2026-09-15T00:00:00Z' },
      { label: 'BMI', value: 31, unit: 'kg/m²', recordedAt: '2026-09-15T00:00:00Z' },
    ], null, 2),
  },
  policy: {
    label: "辖区 · 政策",
    blurb: "一座中等城市试行 12 个月市中心交通拥堵收费。",
    subject: {
      id: 'city-portland-2026',
      name: "波特兰都市区",
      description: "美国太平洋西北部中等城市，市中心人口密集、公共交通成熟，且有组织完善的市中心商业协会。",
      profileJson: JSON.stringify({
        population: 650000,
        downtownEmployment: 110000,
        modeShareTransit: 0.18,
        modeShareCar: 0.62,
        modeShareActive: 0.14,
        avgPeakSpeedMph: 14.2,
        annualCO2Tons: 1820000,
        unemploymentRate: 0.044,
      }, null, 2),
    },
    intervention: {
      id: 'congestion-pricing-12mo',
      name: "市中心拥堵收费试点",
      description: "周一至周五 6～19 时进入中央商务区的车辆，高峰收费 9 美元、非高峰 3 美元。收入用于新增两条快速公交线路，并为低收入乘客降低 30% 票价。试点持续 12 个月，每季度评估。",
      durationValue: '12',
      durationUnit: 'months',
      adherence: '0.78',
    },
    signalsJson: JSON.stringify([
      { label: "市中心车辆行驶里程", value: 1.42, unit: 'million-mi/day', recordedAt: '2026-04-01T00:00:00Z' },
      { label: "公交客流量", value: 118000, unit: 'boardings/day', recordedAt: '2026-04-01T00:00:00Z' },
      { label: "高峰速度", value: 14.2, unit: 'mph', recordedAt: '2026-04-01T00:00:00Z' },
    ], null, 2),
  },
  product: {
    label: "市场 · 产品发布",
    blurb: "一家 SaaS 企业面向价格敏感的专业个人用户推出中间价位套餐。",
    subject: {
      id: 'segment-prosumer-creators',
      name: "专业个人创作者",
      description: "年收入 4 万～12 万美元、自费购买工具的独立创作者，通常组合使用多种工具，对 20% 区间内的价格变化敏感。",
      profileJson: JSON.stringify({
        addressableUsers: 1800000,
        currentPaidConversion: 0.034,
        avgARPU_USD: 22,
        churnMonthly: 0.038,
        npsCurrent: 41,
        topCompetitorPriceUSD: 18,
        topCompetitorMarketShare: 0.31,
      }, null, 2),
    },
    intervention: {
      id: 'mid-tier-pricing-launch',
      name: "推出每月 14 美元中档套餐",
      description: "在免费版与现有每月 29 美元专业版之间新增每月 14 美元的第三档套餐，开放专业版 60% 的功能。现有专业版订阅者保留原权益 90 天，每季度检查迁移情况。试点 6 个月后决定是否全面推广。",
      durationValue: '6',
      durationUnit: 'months',
      adherence: '0.72',
    },
    signalsJson: JSON.stringify([
      { label: "免费转付费比例", value: 0.034, unit: 'rate', recordedAt: '2026-04-01T00:00:00Z' },
      { label: "月流失率", value: 0.038, unit: 'rate', recordedAt: '2026-04-01T00:00:00Z' },
      { label: 'NPS', value: 41, unit: 'score', recordedAt: '2026-04-01T00:00:00Z' },
    ], null, 2),
  },
};

function safeParseJson(value: string, fallback: unknown): unknown {
  if (!value || !value.trim()) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/** A run key. crypto.randomUUID exists only in a secure context, and a server on a LAN address is not one. */
function newRunKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function InterventionDemoCard({ onResult, onError, onRunStart }: InterventionDemoCardProps) {
  const [subject, setSubject] = useState<SubjectForm>(EMPTY_SUBJECT);
  const [intervention, setIntervention] = useState<InterventionForm>(EMPTY_INTERVENTION);
  const [signalsJson, setSignalsJson] = useState<string>('[]');
  const [running, setRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const loadPreset = (key: string) => {
    const p = PRESETS[key];
    if (!p) return;
    setSubject(p.subject);
    setIntervention(p.intervention);
    setSignalsJson(p.signalsJson);
    setActivePreset(key);
  };

  const clearForm = () => {
    setSubject(EMPTY_SUBJECT);
    setIntervention(EMPTY_INTERVENTION);
    setSignalsJson('[]');
    setActivePreset(null);
  };

  const formIsValid = subject.id.trim().length > 0
    && subject.name.trim().length > 0
    && intervention.id.trim().length > 0
    && intervention.name.trim().length > 0
    && intervention.description.trim().length > 0;

  const handleRun = async () => {
    if (running || !formIsValid) return;
    const profile = safeParseJson(subject.profileJson, {}) as Record<string, unknown>;
    const signals = safeParseJson(signalsJson, []) as Array<Record<string, unknown>>;
    const subjectPayload = {
      id: subject.id.trim(),
      name: subject.name.trim(),
      profile: subject.description.trim()
        ? { ...profile, description: subject.description.trim() }
        : profile,
      signals,
      markers: [],
    };
    const durationValueNum = Number(intervention.durationValue);
    const adherenceNum = Number(intervention.adherence);
    const interventionPayload = {
      id: intervention.id.trim(),
      name: intervention.name.trim(),
      description: intervention.description.trim(),
      duration: Number.isFinite(durationValueNum) && durationValueNum > 0
        ? { value: durationValueNum, unit: intervention.durationUnit.trim() || 'weeks' }
        : undefined,
      adherenceProfile: Number.isFinite(adherenceNum)
        ? { expected: Math.max(0, Math.min(1, adherenceNum)) }
        : undefined,
    };

    setRunning(true);
    setElapsedSec(0);
    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      setElapsedSec(Math.round((Date.now() - startedAt) / 1000));
    }, 500);

    const runKey = newRunKey();
    // Awaited: the page's reset posts /clear for the run it held, and a
    // /clear that landed after this run opened would stop it.
    await onRunStart?.({
      runKey,
      subject: { id: subjectPayload.id, name: subjectPayload.name, profile: subjectPayload.profile },
      intervention: {
        id: interventionPayload.id,
        name: interventionPayload.name,
        description: interventionPayload.description,
        duration: interventionPayload.duration,
      },
    });

    try {
      const res = await fetch('/api/quickstart/simulate-intervention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subjectPayload,
          intervention: interventionPayload,
          runKey,
          options: { maxTurns: 2, seed: 11, costPreset: 'economy' },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(body.error ?? `数字孪生运行失败：HTTP ${res.status}`);
      }
      const body = await res.json() as { artifact: RunArtifact; durationMs: number; visitorId?: string };
      emitLaunched(window, body.visitorId);
      onResult(body.artifact, runKey);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : String(err), runKey);
    } finally {
      window.clearInterval(tick);
      setRunning(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.heading}>
        <h3 className={styles.title}>运行数字孪生</h3>
        <span className={styles.eyebrow}>任意对象 · 任意干预措施</span>
      </div>
      <p className={styles.copy}>
        定义一个对象（如患者、细分市场、辖区或车辆），再指定干预措施。Paracosm 通过五部门分析团队执行模型驱动的仿真，并返回包含演变过程的结构化运行记录。
      </p>

      <div className={styles.presetRow}>
        <span className={styles.presetLabel}>示例</span>
        {Object.entries(PRESETS).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            onClick={() => loadPreset(key)}
            className={`${styles.presetButton} ${activePreset === key ? styles.presetButtonActive : ''}`}
            disabled={running}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={clearForm}
          className={styles.presetClear}
          disabled={running}
        >
          清空
        </button>
      </div>
      {activePreset && (
        <p className={styles.presetBlurb}>{PRESETS[activePreset].blurb}</p>
      )}

      <div className={styles.formGrid}>
        <fieldset className={styles.formCell} disabled={running}>
          <legend className={styles.formLegend}>对象</legend>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>ID</span>
            <input
              type="text"
              value={subject.id}
              onChange={(e) => setSubject((s) => ({ ...s, id: e.target.value }))}
              placeholder="patient-001"
              className={styles.input}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>名称</span>
            <input
              type="text"
              value={subject.name}
              onChange={(e) => setSubject((s) => ({ ...s, name: e.target.value }))}
              placeholder="陈玛丽"
              className={styles.input}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>描述</span>
            <textarea
              value={subject.description}
              onChange={(e) => setSubject((s) => ({ ...s, description: e.target.value }))}
              placeholder="年龄、关键属性及初始状态。"
              className={styles.textarea}
              rows={3}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>属性（JSON）</span>
            <textarea
              value={subject.profileJson}
              onChange={(e) => setSubject((s) => ({ ...s, profileJson: e.target.value }))}
              placeholder='{"age": 58, "bmi": 31}'
              className={`${styles.textarea} ${styles.mono}`}
              rows={5}
              spellCheck={false}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>观测信号（JSON）</span>
            <textarea
              value={signalsJson}
              onChange={(e) => setSignalsJson(e.target.value)}
              placeholder='[{"label":"HbA1c","value":7.8,"unit":"%"}]'
              className={`${styles.textarea} ${styles.mono}`}
              rows={4}
              spellCheck={false}
            />
          </label>
        </fieldset>

        <fieldset className={styles.formCell} disabled={running}>
          <legend className={styles.formLegend}>干预措施</legend>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>ID</span>
            <input
              type="text"
              value={intervention.id}
              onChange={(e) => setIntervention((iv) => ({ ...iv, id: e.target.value }))}
              placeholder="semaglutide-12wk"
              className={styles.input}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>名称</span>
            <input
              type="text"
              value={intervention.name}
              onChange={(e) => setIntervention((iv) => ({ ...iv, name: e.target.value }))}
              placeholder="12 周司美格鲁肽方案"
              className={styles.input}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>描述</span>
            <textarea
              value={intervention.description}
              onChange={(e) => setIntervention((iv) => ({ ...iv, description: e.target.value }))}
              placeholder="采取什么措施、由谁执行，以及如何监测。"
              className={styles.textarea}
              rows={5}
            />
          </label>
          <div className={styles.fieldRow}>
            <label className={`${styles.field} ${styles.fieldThird}`}>
              <span className={styles.fieldLabel}>持续时间</span>
              <input
                type="number"
                min="1"
                value={intervention.durationValue}
                onChange={(e) => setIntervention((iv) => ({ ...iv, durationValue: e.target.value }))}
                className={styles.input}
              />
            </label>
            <label className={`${styles.field} ${styles.fieldThird}`}>
              <span className={styles.fieldLabel}>单位</span>
              <select
                value={intervention.durationUnit}
                onChange={(e) => setIntervention((iv) => ({ ...iv, durationUnit: e.target.value }))}
                className={styles.input}
              >
                <option value="days">天</option>
                <option value="weeks">周</option>
                <option value="months">月</option>
                <option value="quarters">季度</option>
                <option value="years">年</option>
              </select>
            </label>
            <label className={`${styles.field} ${styles.fieldThird}`}>
              <span className={styles.fieldLabel}>执行程度</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={intervention.adherence}
                onChange={(e) => setIntervention((iv) => ({ ...iv, adherence: e.target.value }))}
                className={styles.input}
              />
            </label>
          </div>
        </fieldset>
      </div>

      <div className={styles.actions}>
        <button onClick={handleRun} disabled={running || !formIsValid} className={styles.button}>
          {running ? '运行中…' : "运行数字孪生"}
        </button>
        {running ? (
          <span className={styles.timer} role="status" aria-live="polite">
            <span className={styles.spinner} aria-hidden="true" />
            {elapsedSec}秒已用时 · 2 个回合的模型决策，通常需要 40～90 秒
          </span>
        ) : (
          <span className={styles.helper}>2 个回合 · 随机种子 11 · 经济配置</span>
        )}
      </div>
    </div>
  );
}
