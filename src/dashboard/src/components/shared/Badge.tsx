interface BadgeProps {
  outcome: string;
}

const OUTCOME_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
  risky_success:        { bg: 'rgba(232,180,74,.12)', color: 'var(--vis)',   border: 'var(--amber-dim)', label: "冒险成功" },
  risky_failure:        { bg: 'rgba(224,101,48,.12)', color: 'var(--rust)',  border: 'var(--rust-dim)',  label: "冒险失败" },
  conservative_success: { bg: 'rgba(106,173,72,.12)', color: 'var(--green)', border: 'rgba(106,173,72,.25)', label: "保守成功" },
  conservative_failure: { bg: 'rgba(224,101,48,.08)', color: 'var(--rust)',  border: 'var(--rust-dim)',  label: "保守失败" },
};

export function Badge({ outcome }: BadgeProps) {
  const s = OUTCOME_STYLES[outcome] || { bg: 'var(--bg-card)', color: 'var(--text-3)', border: 'var(--border)', label: outcome.replace(/_/g, ' ').toUpperCase() };

  return (
    <span style={{
      padding: '3px 10px', borderRadius: '4px', fontSize: 'var(--font-xs)', fontWeight: 800,
      fontFamily: 'var(--mono)', display: 'inline-block', whiteSpace: 'nowrap',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {s.label}
    </span>
  );
}
