type BarDatum = { label: string; value: number };

export default function BarChart({
  title,
  unit,
  data,
  formatValue,
}: {
  title: string;
  unit?: string;
  data: BarDatum[];
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const fmt = formatValue ?? ((v: number) => `${v.toLocaleString()}${unit ?? ""}`);

  return (
    <div className="bg-card border border-line rounded-2xl p-5">
      <div className="text-[13px] font-semibold mb-4">{title}</div>
      {data.length === 0 ? (
        <div className="text-[13px] text-muted py-6 text-center">데이터 없음</div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((d) => (
            <div key={d.label} className="flex items-center gap-3">
              <div className="w-16 shrink-0 text-[12px] text-muted truncate" title={d.label}>
                {d.label}
              </div>
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <div className="flex-1 h-4 bg-bg rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${Math.max(4, (d.value / max) * 100)}%` }}
                  />
                </div>
                <div className="text-[12px] font-semibold shrink-0 w-14 text-right">
                  {fmt(d.value)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
