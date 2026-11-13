import { localizeTemplate } from '../../template-localization';
import { useId } from 'react';
import { HexacoSlider } from './HexacoSlider';
import { TraitModelNotice } from './TraitModelNotice';
import styles from './ActorConfig.module.scss';

export interface ActorFormData {
  name: string;
  archetype: string;
  unit: string;
  instructions: string;
  hexaco: Record<string, number>;
}

interface ActorConfigProps {
  label: string;
  sideColor: string;
  data: ActorFormData;
  onChange: (data: ActorFormData) => void;
}

const HEXACO_TRAITS = [
  { key: 'openness', label: "开放性", short: 'O' },
  { key: 'conscientiousness', label: "尽责性", short: 'C' },
  { key: 'extraversion', label: "外向性", short: 'E' },
  { key: 'agreeableness', label: "宜人性", short: 'A' },
  { key: 'emotionality', label: "情绪性", short: 'Em' },
  { key: 'honestyHumility', label: "诚实—谦逊", short: 'HH' },
];

const PERSONALITY_PRESETS = [
  { id: 'visionary', label: "愿景家（高开放性、低尽责性）", hexaco: { openness: 0.95, conscientiousness: 0.35, extraversion: 0.85, agreeableness: 0.55, emotionality: 0.30, honestyHumility: 0.65 } },
  { id: 'engineer', label: "工程师（高尽责性、低开放性）", hexaco: { openness: 0.25, conscientiousness: 0.97, extraversion: 0.30, agreeableness: 0.60, emotionality: 0.70, honestyHumility: 0.90 } },
  { id: 'diplomat', label: "外交家（高宜人性、高诚实谦逊）", hexaco: { openness: 0.60, conscientiousness: 0.55, extraversion: 0.70, agreeableness: 0.90, emotionality: 0.50, honestyHumility: 0.85 } },
  { id: 'maverick', label: "独行者（高开放性、高外向性、低宜人性）", hexaco: { openness: 0.90, conscientiousness: 0.40, extraversion: 0.95, agreeableness: 0.25, emotionality: 0.20, honestyHumility: 0.40 } },
  { id: 'guardian', label: "守护者（高尽责性、高情绪性、高诚实谦逊）", hexaco: { openness: 0.30, conscientiousness: 0.85, extraversion: 0.40, agreeableness: 0.70, emotionality: 0.85, honestyHumility: 0.95 } },
  { id: 'strategist', label: "战略家（均衡、低情绪性）", hexaco: { openness: 0.65, conscientiousness: 0.75, extraversion: 0.50, agreeableness: 0.45, emotionality: 0.20, honestyHumility: 0.55 } },
  { id: 'balanced', label: "均衡型（各项 0.50）", hexaco: { openness: 0.50, conscientiousness: 0.50, extraversion: 0.50, agreeableness: 0.50, emotionality: 0.50, honestyHumility: 0.50 } },
];

export function ActorConfig({ label, sideColor, data, onChange }: ActorConfigProps) {
  // One id prefix per component instance so two ActorConfig components
  // on the same page (Commander A + Commander B) never collide.
  const idPrefix = useId();
  const nameId = `${idPrefix}-name`;
  const archetypeId = `${idPrefix}-archetype`;
  const unitId = `${idPrefix}-unit`;
  const instructionsId = `${idPrefix}-instructions`;
  const presetId = `${idPrefix}-preset`;

  const update = (field: keyof ActorFormData, value: string) =>
    onChange({ ...data, [field]: value });

  const updateHexaco = (key: string, value: number) =>
    onChange({ ...data, hexaco: { ...data.hexaco, [key]: value } });

  return (
    <div
      className={styles.root}
      style={{ ['--side-color' as string]: sideColor }}
    >
      <h3 className={styles.heading}>{label}</h3>
      <div className={`responsive-stack ${styles.fieldRow}`}>
        <div className={styles.field}>
          <label htmlFor={nameId} className={styles.label}>名称</label>
          <input id={nameId} value={data.name} onChange={e => update('name', e.target.value)} className={styles.input} />
        </div>
        <div className={styles.field}>
          <label htmlFor={archetypeId} className={styles.label}>人物类型</label>
          <input id={archetypeId} value={data.archetype} onChange={e => update('archetype', e.target.value)} className={styles.input} />
        </div>
        <div className={styles.field}>
          <label htmlFor={unitId} className={styles.label}>单位</label>
          <input id={unitId} value={localizeTemplate(data.unit)} onChange={e => update('unit', e.target.value)} className={styles.input} />
        </div>
      </div>
      <div className={styles.textareaBlock}>
        <label htmlFor={instructionsId} className={styles.label}>角色指令</label>
        <textarea
          id={instructionsId}
          value={data.instructions}
          onChange={e => update('instructions', e.target.value)}
          rows={5}
          className={styles.textarea}
        />
      </div>
      <TraitModelNotice />
      {/* Personality Presets */}
      <div className={styles.presetRow}>
        <label htmlFor={presetId} className={styles.presetLabel}>人格</label>
        <select
          id={presetId}
          className={`pc-select ${styles.presetSelect}`}
          onChange={e => {
            const p = PERSONALITY_PRESETS.find(p => p.id === e.target.value);
            if (p) onChange({ ...data, hexaco: { ...p.hexaco } });
          }}
          defaultValue=""
        >
          <option value="" disabled>应用预设…</option>
          {PERSONALITY_PRESETS.map(p => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>
      {/* HEXACO Sliders */}
      <div className={`responsive-grid-3 ${styles.hexacoGrid}`}>
        {HEXACO_TRAITS.map(t => (
          <HexacoSlider key={t.key} label={t.label} shortLabel={t.short} value={data.hexaco[t.key] ?? 0.5} onChange={v => updateHexaco(t.key, v)} sideColor={sideColor} />
        ))}
      </div>
    </div>
  );
}
