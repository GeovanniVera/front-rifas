import { useMemo, useState } from 'react';
import {
  LuCircleDollarSign,
  LuTicket,
  LuTrendingUp,
  LuShoppingBag,
  LuFileText,
  LuFileSpreadsheet,
  LuLoader,
  LuArrowUpRight,
  LuChevronDown,
  LuHistory,
  LuRotateCcw,
} from 'react-icons/lu';
import { useAdminEarnings } from '../../features/earnings/hooks/useEarnings';
import {
  earningsService,
  type EarningsPeriod,
} from '../../features/earnings/services/earnings.service';
import { useHasPrivilege } from '../../auth/hooks';
import { useToast } from '@components/feedback';
import { formatCurrency } from '@config/constants';

const PERIOD_TABS: { id: EarningsPeriod; label: string }[] = [
  { id: 'DAY', label: 'DÍA' },
  { id: 'WEEK', label: 'SEMANA' },
  { id: 'FORTNIGHT', label: 'QUINCENA' },
];

export default function AdminEarningsPage() {
  const toast = useToast();
  const canReadRaffles = useHasPrivilege('raffles.read');

  const [activeTab, setActiveTab] = useState<EarningsPeriod>('DAY');
  const [offset, setOffset] = useState<number>(0);
  const [hoveredBar, setHoveredBar] = useState<number>(0);
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);
  const [methodFilter, setMethodFilter] = useState<'TODOS' | 'Tarjeta' | 'OXXO' | 'Transferencia'>(
    'TODOS',
  );
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'xlsx' | null>(null);

  const {
    data: report,
    isLoading,
    isError,
    refetch,
  } = useAdminEarnings(activeTab, offset, {
    enabled: canReadRaffles,
  });

  const handleSelectTab = (tab: EarningsPeriod) => {
    setActiveTab(tab);
    setOffset(0);
    setHoveredBar(0);
    setHoveredCategory(null);
  };

  const handleExport = async (format: 'pdf' | 'xlsx') => {
    setExportingFormat(format);
    try {
      await earningsService.exportReport(activeTab, offset, format, methodFilter);
      toast.success(
        `Reporte ${activeTab === 'DAY' ? 'diario' : activeTab === 'WEEK' ? 'semanal' : 'quincenal'} descargado en ${format.toUpperCase()}`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al generar el reporte';
      toast.error(msg);
    } finally {
      setExportingFormat(null);
    }
  };

  const tabIndicatorTransform =
    activeTab === 'DAY'
      ? 'translateX(0%)'
      : activeTab === 'WEEK'
        ? 'translateX(100%)'
        : 'translateX(200%)';

  const series = useMemo(() => report?.chartSeries ?? [], [report]);
  const distribution = useMemo(() => report?.distribution ?? [], [report]);
  const movements = useMemo(() => report?.movements ?? [], [report]);

  const filteredMovements = useMemo(() => {
    if (methodFilter === 'TODOS') return movements;
    return movements.filter((m) => m.paymentMethod.toLowerCase() === methodFilter.toLowerCase());
  }, [movements, methodFilter]);

  // Geometría SVG para gráfica de barras
  const maxChartValue = useMemo(() => {
    const rawMax = Math.max(...series.map((s) => s.amount), 500);
    return Math.ceil(rawMax / 500) * 500;
  }, [series]);

  const yAxisTicks = useMemo(() => {
    const steps = 4;
    const topY = 24;
    const bottomY = 222;
    const result: { value: number; y: number; label: string }[] = [];
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const value = Math.round(maxChartValue * (1 - ratio));
      const y = topY + ratio * (bottomY - topY);
      const label =
        value >= 1000 ? `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` : `$${value}`;
      result.push({ value, y, label });
    }
    return result;
  }, [maxChartValue]);

  const computedBars = useMemo(() => {
    if (series.length === 0) return [];
    const startX = 64;
    const endX = 744;
    const totalWidth = endX - startX;
    const slotWidth = totalWidth / series.length;
    const barWidth = Math.min(34, Math.max(14, slotWidth * 0.54));
    const topY = 24;
    const bottomY = 222;
    const chartHeight = bottomY - topY;

    return series.map((pt, index) => {
      const centerX = startX + slotWidth * index + slotWidth / 2;
      const x = centerX - barWidth / 2;
      const barHeight = pt.amount > 0 ? Math.max(8, (pt.amount / maxChartValue) * chartHeight) : 4;
      const y = bottomY - barHeight;

      return {
        ...pt,
        x,
        y,
        width: barWidth,
        height: barHeight,
        centerX,
        hitX: startX + slotWidth * index,
        hitWidth: slotWidth,
      };
    });
  }, [series, maxChartValue]);

  const trendLinePath = useMemo(() => {
    if (computedBars.length === 0) return '';
    return computedBars
      .map((b, idx) => `${idx === 0 ? 'M' : 'L'} ${b.centerX.toFixed(1)} ${b.y.toFixed(1)}`)
      .join(' ');
  }, [computedBars]);

  const activePoint =
    series[Math.min(Math.max(0, hoveredBar), Math.max(0, series.length - 1))] ?? null;

  // Geometría SVG para dona de distribución
  const donutSegments = useMemo(() => {
    const radius = 58;
    const circumference = 2 * Math.PI * radius;

    return distribution.map((item, idx) => {
      const prevPercent = distribution
        .slice(0, idx)
        .reduce((acc, prev) => acc + prev.percentage, 0);
      const segmentLength = (item.percentage / 100) * circumference;
      const dashArray =
        item.percentage > 0
          ? `${Math.max(0, segmentLength - 3)} ${circumference}`
          : `0 ${circumference}`;
      const dashOffset = -((prevPercent / 100) * circumference);

      return {
        ...item,
        dashArray,
        dashOffset,
      };
    });
  }, [distribution]);

  const activeDonutLabel =
    hoveredCategory !== null && distribution[hoveredCategory]
      ? distribution[hoveredCategory].category
      : `TOTAL ${activeTab === 'DAY' ? 'DÍA' : activeTab === 'WEEK' ? 'SEMANA' : 'QUINCENA'}`;

  const activeDonutValue =
    hoveredCategory !== null && distribution[hoveredCategory]
      ? formatCurrency(distribution[hoveredCategory].amount)
      : formatCurrency(report?.kpis.totalEarnings ?? 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LuLoader size={26} className="text-accent animate-spin" />
        <span className="text-fg-muted ml-2.5 text-sm">Cargando corte de ganancias...</span>
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div style={{ padding: '32px 40px', maxWidth: 1440, width: '100%', margin: '0 auto' }}>
        <div className="border-border-base bg-surface rounded-2xl border p-8 text-center">
          <p className="text-fg text-base font-semibold">
            No se pudo cargar el reporte de ganancias
          </p>
          <p className="text-fg-muted mt-1 text-sm">
            Verifica que el servidor backend esté activo y vuelve a intentar.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="bg-accent mt-4 cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold text-white"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const activeOptionLabel =
    report.selectorOptions.find((o) => o.offset === offset)?.label ?? report.rangeLabel;

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1440, width: '100%', margin: '0 auto' }}>
      <div className="space-y-6">
        {/* 1. ENCABEZADO + BOTONES SEPARADOS: DÍA | SEMANA | QUINCENA */}
        <section className="border-border-base bg-surface rounded-2xl border p-6 shadow-xs sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-fg text-2xl font-bold tracking-tight whitespace-nowrap sm:text-[28px]">
                  Revisión de Ganancias
                </h1>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                    admin
                  </span>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    corte real
                  </span>
                </div>
              </div>
              <p className="text-fg-muted mt-1.5 text-sm">
                Consulta tus ingresos por venta de boletos separados por día, semana o quincena y
                exporta reportes en PDF o Excel.
              </p>
            </div>

            {/* Selector de botones DÍA / SEMANA / QUINCENA + sub-periodo */}
            <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <div
                className="border-border-base bg-background relative inline-grid w-full grid-cols-3 rounded-xl border p-1 sm:w-[324px]"
                role="tablist"
                aria-label="Periodo de revisión de ganancias"
              >
                <div
                  className="border-border-base bg-surface pointer-events-none absolute top-1 bottom-1 left-1 rounded-lg border shadow-xs transition-transform duration-300"
                  style={{
                    width: 'calc((100% - 8px) / 3)',
                    transform: tabIndicatorTransform,
                  }}
                />

                {PERIOD_TABS.map((tab) => {
                  const selected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => handleSelectTab(tab.id)}
                      className={`relative z-10 cursor-pointer rounded-lg px-2 py-2 text-center text-xs font-bold tracking-wider uppercase transition-colors ${
                        selected ? 'text-accent' : 'text-fg-muted hover:text-fg'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative shrink-0">
                <select
                  value={offset}
                  onChange={(e) => {
                    setOffset(Number(e.target.value) || 0);
                    setHoveredBar(0);
                  }}
                  aria-label="Seleccionar rango específico"
                  className="border-border-base bg-background text-fg w-full cursor-pointer appearance-none truncate rounded-xl border py-2.5 pr-9 pl-3.5 text-xs font-semibold transition-colors focus:outline-none sm:w-[250px]"
                >
                  {report.selectorOptions.map((opt) => (
                    <option key={opt.offset} value={opt.offset}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <LuChevronDown
                  size={15}
                  className="text-fg-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
                />
              </div>
            </div>
          </div>

          {offset > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] px-4 py-2.5 text-xs">
              <div className="flex items-center gap-2 text-[var(--warning-strong)]">
                <LuHistory size={15} className="shrink-0" />
                <span>
                  {activeTab === 'DAY' && (
                    <>
                      Te encuentras consultando un <strong>día anterior</strong> (
                      {activeOptionLabel}).
                    </>
                  )}
                  {activeTab === 'WEEK' && (
                    <>
                      Te encuentras consultando una <strong>semana anterior</strong> (
                      {activeOptionLabel}).
                    </>
                  )}
                  {activeTab === 'FORTNIGHT' && (
                    <>
                      Te encuentras consultando una <strong>quincena anterior</strong> (
                      {activeOptionLabel}).
                    </>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOffset(0);
                  setHoveredBar(0);
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--warning)] px-3 py-1.5 text-xs font-semibold text-[var(--warning-solid-fg)] transition-opacity hover:opacity-90"
              >
                <LuRotateCcw size={13} />
                {activeTab === 'DAY'
                  ? 'Regresar al día de hoy'
                  : activeTab === 'WEEK'
                    ? 'Regresar a la semana actual'
                    : 'Regresar a la quincena actual'}
              </button>
            </div>
          )}

          <div className="border-border-base/60 text-fg-muted mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-full bg-emerald-500" />
              <span>
                Vista activa: <strong className="text-fg">{report.title}</strong> (
                {activeOptionLabel})
              </span>
            </div>
            <span className="text-[11px] font-semibold tracking-wider uppercase opacity-75">
              {report.rangeLabel}
            </span>
          </div>
        </section>

        {/* 2. CUATRO TARJETAS KPI */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <article
            className="border-border-base bg-surface flex flex-col justify-between rounded-2xl border p-6 shadow-xs"
            style={{ borderTop: '3.5px solid #10B981' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <LuCircleDollarSign size={20} />
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                <LuArrowUpRight size={12} />
                {report.kpis.earningsTrend}
              </span>
            </div>
            <div className="mt-5">
              <div className="text-fg text-3xl font-bold tracking-tight">
                {formatCurrency(report.kpis.totalEarnings)}
              </div>
              <div className="text-fg-muted mt-2 text-[11px] font-bold tracking-wider uppercase">
                GANANCIAS TOTALES
              </div>
            </div>
          </article>

          <article
            className="border-border-base bg-surface flex flex-col justify-between rounded-2xl border p-6 shadow-xs"
            style={{ borderTop: '3.5px solid #F59E0B' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <LuTicket size={20} />
              </div>
              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                {report.kpis.ticketsTrend}
              </span>
            </div>
            <div className="mt-5">
              <div className="text-fg text-3xl font-bold tracking-tight">
                {report.kpis.ticketsSold}
              </div>
              <div className="text-fg-muted mt-2 text-[11px] font-bold tracking-wider uppercase">
                BOLETOS VENDIDOS
              </div>
            </div>
          </article>

          <article
            className="border-border-base bg-surface flex flex-col justify-between rounded-2xl border p-6 shadow-xs"
            style={{ borderTop: '3.5px solid #6366F1' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <LuTrendingUp size={20} />
              </div>
              <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-400">
                {report.kpis.averageTrend}
              </span>
            </div>
            <div className="mt-5">
              <div className="text-fg text-3xl font-bold tracking-tight">
                {formatCurrency(report.kpis.averageTicket)}
              </div>
              <div className="text-fg-muted mt-2 text-[11px] font-bold tracking-wider uppercase">
                TICKET PROMEDIO POR COMPRA
              </div>
            </div>
          </article>

          <article
            className="border-border-base bg-surface flex flex-col justify-between rounded-2xl border p-6 shadow-xs"
            style={{ borderTop: '3.5px solid #A855F7' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <LuShoppingBag size={20} />
              </div>
              <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700 dark:text-purple-400">
                {report.kpis.rafflesCountLabel}
              </span>
            </div>
            <div className="mt-5">
              <div className="text-fg text-3xl font-bold tracking-tight">
                {report.kpis.transactionsCount}
              </div>
              <div className="text-fg-muted mt-2 text-[11px] font-bold tracking-wider uppercase">
                COMPRAS REALIZADAS
              </div>
            </div>
          </article>
        </section>

        {/* 3. GRÁFICAS VISUALES INTERACTIVAS */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Gráfica Principal: Evolución de Ganancias */}
          <div className="border-border-base bg-surface flex flex-col justify-between rounded-2xl border p-6 shadow-xs lg:col-span-8">
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <span className="text-fg-muted text-[11px] font-bold tracking-wider uppercase">
                  COMPORTAMIENTO DE INGRESOS
                </span>
                <h2 className="text-fg mt-0.5 text-xl font-bold">
                  {activeTab === 'DAY' && 'Evolución de Ganancias por Franja Horaria'}
                  {activeTab === 'WEEK' && 'Ganancias Diarias de la Semana'}
                  {activeTab === 'FORTNIGHT' && 'Flujo Diario de la Quincena'}
                </h2>
              </div>

              {activePoint && (
                <div className="border-border-base bg-background flex items-center gap-3 self-start rounded-xl border px-3.5 py-2 sm:self-auto">
                  <div>
                    <div className="text-fg-muted text-[10px] font-bold tracking-wider uppercase">
                      {activePoint.subLabel}
                    </div>
                    <div className="text-accent text-base font-bold">
                      {formatCurrency(activePoint.amount)}{' '}
                      <span className="text-fg-muted ml-1 text-xs font-medium">
                        ({activePoint.tickets} bol.)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative w-full pt-2">
              <svg
                className="h-[275px] w-full overflow-visible select-none"
                viewBox="0 0 760 260"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="emeraldBarGradReact" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.92" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.22" />
                  </linearGradient>
                  <linearGradient id="emeraldBarActiveGradReact" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity="1" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.45" />
                  </linearGradient>
                </defs>

                {yAxisTicks.map((tick) => (
                  <g key={tick.value}>
                    <line
                      x1="56"
                      y1={tick.y}
                      x2="748"
                      y2={tick.y}
                      stroke="currentColor"
                      strokeOpacity="0.12"
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                    />
                    <text
                      x="48"
                      y={tick.y + 4}
                      textAnchor="end"
                      fill="#94A3B8"
                      fontSize="11"
                      fontWeight="500"
                    >
                      {tick.label}
                    </text>
                  </g>
                ))}

                {computedBars.map((bar, i) => (
                  <g
                    key={bar.label}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredBar(i)}
                    onClick={() => setHoveredBar(i)}
                  >
                    <rect
                      x={bar.hitX}
                      y="16"
                      width={bar.hitWidth}
                      height="210"
                      fill="transparent"
                    />
                    {hoveredBar === i && (
                      <rect
                        x={bar.x - 4}
                        y="18"
                        width={bar.width + 8}
                        height="204"
                        rx="8"
                        fill="#10B981"
                        opacity="0.1"
                      />
                    )}
                    <rect
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={bar.height}
                      rx="6"
                      fill={
                        hoveredBar === i
                          ? 'url(#emeraldBarActiveGradReact)'
                          : 'url(#emeraldBarGradReact)'
                      }
                    />
                    <rect
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height="3"
                      rx="1.5"
                      fill={hoveredBar === i ? '#047857' : '#10B981'}
                    />
                    <text
                      x={bar.centerX}
                      y="244"
                      textAnchor="middle"
                      fill={hoveredBar === i ? '#10B981' : '#64748B'}
                      fontWeight={hoveredBar === i ? '700' : '500'}
                      fontSize="11"
                    >
                      {bar.label}
                    </text>
                  </g>
                ))}

                {trendLinePath && (
                  <path
                    d={trendLinePath}
                    fill="none"
                    stroke="#059669"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.65"
                  />
                )}

                {computedBars.map((bar, i) => (
                  <circle
                    key={`dot-${bar.label}`}
                    cx={bar.centerX}
                    cy={bar.y}
                    r={hoveredBar === i ? 5 : 3}
                    fill={hoveredBar === i ? '#0B4F32' : '#FFFFFF'}
                    stroke="#059669"
                    strokeWidth="2"
                    className="pointer-events-none"
                  />
                ))}
              </svg>
            </div>
          </div>

          {/* Gráfica Secundaria: Distribución por Método de Pago */}
          <div className="border-border-base bg-surface flex flex-col justify-between rounded-2xl border p-6 shadow-xs lg:col-span-4">
            <div>
              <span className="text-fg-muted text-[11px] font-bold tracking-wider uppercase">
                ORIGEN DE GANANCIAS
              </span>
              <h2 className="text-fg mt-0.5 text-xl font-bold">Distribución por Método</h2>
            </div>

            <div className="relative my-5 flex items-center justify-center">
              <svg className="size-48 -rotate-90" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r="58"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeWidth="18"
                />
                {donutSegments.map((seg, idx) => (
                  <circle
                    key={seg.category}
                    cx="80"
                    cy="80"
                    r="58"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={hoveredCategory === idx ? 21 : 18}
                    strokeDasharray={seg.dashArray}
                    strokeDashoffset={seg.dashOffset}
                    strokeLinecap="round"
                    className="cursor-pointer transition-all duration-300"
                    onMouseEnter={() => setHoveredCategory(idx)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  />
                ))}
              </svg>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <span className="text-fg-muted text-[10px] font-bold tracking-wider uppercase">
                  {activeDonutLabel}
                </span>
                <span className="text-fg mt-0.5 text-xl font-bold">{activeDonutValue}</span>
              </div>
            </div>

            <div className="space-y-3">
              {distribution.map((item, idx) => (
                <div
                  key={item.category}
                  className={`cursor-pointer rounded-xl border p-2.5 transition-colors ${
                    hoveredCategory === idx
                      ? 'border-border-base bg-background'
                      : 'border-transparent'
                  }`}
                  onMouseEnter={() => setHoveredCategory(idx)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <div className="text-fg flex items-center gap-2 font-semibold">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-fg font-bold">{formatCurrency(item.amount)}</span>
                      <span className="text-fg-muted w-9 text-right text-[11px] font-semibold">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="bg-background h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. DESGLOSE DE MOVIMIENTOS + EXPORTACIÓN PDF / XLSX */}
        <section className="space-y-3">
          <div className="flex flex-col justify-between gap-3 px-1 sm:flex-row sm:items-center">
            <h2 className="text-fg-muted text-xs font-bold tracking-wider uppercase">
              DESGLOSE DE MOVIMIENTOS —{' '}
              {activeTab === 'DAY' ? 'DÍA' : activeTab === 'WEEK' ? 'SEMANA' : 'QUINCENA'}
            </h2>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filtro por método de pago */}
              <div className="border-border-base bg-surface inline-flex rounded-xl border p-1 text-xs">
                {(['TODOS', 'Tarjeta', 'OXXO', 'Transferencia'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setMethodFilter(opt)}
                    className={`cursor-pointer rounded-lg px-2.5 py-1 font-medium transition-colors ${
                      methodFilter === opt ? 'bg-accent text-white' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {opt === 'TODOS' ? 'Todos' : opt}
                  </button>
                ))}
              </div>

              {/* Botón Exportar PDF */}
              <button
                type="button"
                onClick={() => handleExport('pdf')}
                disabled={exportingFormat !== null}
                className="border-border-base bg-surface text-fg hover:bg-background inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
              >
                {exportingFormat === 'pdf' ? (
                  <LuLoader size={15} className="animate-spin" />
                ) : (
                  <LuFileText size={15} className="text-red-600 dark:text-red-400" />
                )}
                <span>Exportar PDF</span>
              </button>

              {/* Botón Exportar XLSX */}
              <button
                type="button"
                onClick={() => handleExport('xlsx')}
                disabled={exportingFormat !== null}
                className="border-border-base bg-surface text-fg hover:bg-background inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
              >
                {exportingFormat === 'xlsx' ? (
                  <LuLoader size={15} className="animate-spin" />
                ) : (
                  <LuFileSpreadsheet size={15} className="text-emerald-600 dark:text-emerald-400" />
                )}
                <span>Exportar Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          <div className="border-border-base bg-surface overflow-hidden rounded-2xl border shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-border-base bg-background/70 text-fg-muted border-b text-[11px] font-bold tracking-wider uppercase">
                    <th className="px-5 py-3.5">Folio</th>
                    <th className="px-5 py-3.5">Rifa / Concepto</th>
                    <th className="px-5 py-3.5">Boletos</th>
                    <th className="px-5 py-3.5">Comprador</th>
                    <th className="px-5 py-3.5">Método de Pago</th>
                    <th className="px-5 py-3.5">Fecha y Hora</th>
                    <th className="px-5 py-3.5 text-right">Monto Total</th>
                  </tr>
                </thead>
                <tbody className="divide-border-base/60 divide-y text-sm">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-fg-muted py-10 text-center text-sm">
                        No hay movimientos registrados para este filtro en el periodo seleccionado.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((mov) => (
                      <tr key={mov.id} className="hover:bg-background/50 transition-colors">
                        <td className="text-fg-muted px-5 py-4 font-mono text-xs font-semibold">
                          {mov.folio}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <LuTicket size={15} />
                            </div>
                            <div>
                              <div className="text-fg font-semibold">{mov.concept}</div>
                              <div className="text-fg-muted text-xs">
                                {mov.ticketNumbers.map((n) => `#${n}`).join(', ')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-fg px-5 py-4 text-xs font-semibold">
                          {mov.tickets} bol.
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-fg text-xs font-medium">{mov.buyerName}</div>
                          <div className="text-fg-muted text-[11px]">{mov.buyerEmail}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="bg-background text-fg border-border-base inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
                            {mov.paymentMethod}
                          </span>
                        </td>
                        <td className="text-fg-muted px-5 py-4 text-xs">{mov.timestamp}</td>
                        <td className="text-fg px-5 py-4 text-right text-base font-bold">
                          {formatCurrency(mov.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
