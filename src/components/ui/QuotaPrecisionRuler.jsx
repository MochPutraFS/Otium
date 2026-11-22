/**
 * QuotaPrecisionRuler — 12-Day Archival Precision Scale dengan presisi 0.5 hari kerja.
 * Menampilkan sisa kuota solid (Spruce) dan arsiran proyeksi pengurangan (Ochre) saat delta > 0.
 *
 * @param {object} props
 * @param {number} [props.total=12] - Total kuota tahunan (default 12 hari kerja)
 * @param {number} [props.remaining=0] - Sisa kuota saat ini (mendukung desimal 0.5)
 * @param {number} [props.delta=0] - Proyeksi pengurangan hari kerja untuk simulasi form pengajuan
 * @param {boolean} [props.showTicks=true] - Tampilkan label skala 0 / tengah / total di bawah ruler
 * @param {string} [props.className=""] - Kelas tambahan untuk wrapper
 */
export default function QuotaPrecisionRuler({
  total = 12,
  remaining = 0,
  delta = 0,
  showTicks = true,
  className = "",
}) {
  const safeTotal = Math.max(1, Number(total) || 12);
  const units = Math.max(1, Math.round(safeTotal));
  const safeRemaining = Math.max(0, Math.min(safeTotal, Number(remaining) || 0));
  const safeDelta = Math.max(0, Number(delta) || 0);
  const projRemaining = Math.max(0, safeRemaining - safeDelta);

  const segments = Array.from({ length: units }, (_, index) => {
    const solidWidth = Math.max(0, Math.min(1, projRemaining - index)) * 100;
    const projEnd = Math.max(0, Math.min(1, safeRemaining - index)) * 100;
    const projWidth = Math.max(0, projEnd - solidWidth);

    return { index, solidWidth, projWidth };
  });

  const midLabel = Number.isInteger(safeTotal / 2)
    ? (safeTotal / 2).toFixed(0)
    : (safeTotal / 2).toFixed(1);

  const ariaLabel = `Skala kuota: tersisa ${projRemaining.toFixed(1)} dari ${safeTotal.toFixed(1)} hari kerja${
    safeDelta > 0 ? `, simulasi potong ${safeDelta.toFixed(1)} hari` : ""
  }`;

  return (
    <div
      className={`quota-ruler-wrap ${className}`.trim()}
      role="img"
      aria-label={ariaLabel}
    >
      <div
        className="quota-ruler"
        style={{ gridTemplateColumns: `repeat(${units}, minmax(0, 1fr))` }}
      >
        {segments.map(({ index, solidWidth, projWidth }) => (
          <span key={index} className="quota-seg" aria-hidden="true">
            {projWidth > 0 && (
              <span
                className="quota-seg-fill quota-seg-proj"
                style={{ left: `${solidWidth}%`, width: `${projWidth}%` }}
              />
            )}
            {solidWidth > 0 && (
              <span
                className="quota-seg-fill quota-seg-rem"
                style={{ width: `${solidWidth}%` }}
              />
            )}
          </span>
        ))}
      </div>

      {showTicks && (
        <div className="quota-ruler-ticks" aria-hidden="true">
          <span>0 hr</span>
          <span>{midLabel} hr</span>
          <span>{safeTotal.toFixed(0)} hr</span>
        </div>
      )}
    </div>
  );
}
