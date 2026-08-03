import React, { useState, useMemo, useRef } from 'react';
import { Pie } from '@visx/shape';
import { scaleOrdinal } from '@visx/scale';
import { Group } from '@visx/group';
import { animated, useTransition, interpolate } from '@react-spring/web';
import { Maximize2 } from 'lucide-react';

// Vibrant glassmorphic palette
const CATEGORY_COLORS = [
  '#3b82f6', // Vivid Blue (Microsoft 365)
  '#10b981', // Emerald Mint (Cloud & IT)
  '#8b5cf6', // Deep Purple (SSL Security)
  '#f59e0b', // Amber Gold (AWS Enterprise)
  '#ec4899', // Hot Pink (Domains & DNS)
  '#06b6d4', // Cyan (Google Workspace)
  '#6366f1', // Indigo (Cloud Backup)
  '#f97316', // Orange (Endpoint Security)
];

const SUB_PRODUCT_COLORS = [
  '#60a5fa', // Soft Blue
  '#34d399', // Soft Mint
  '#c084fc', // Soft Purple
  '#fbbf24', // Soft Gold
  '#f472b6', // Soft Pink
  '#38bdf8', // Soft Sky
];

function categorizeService(rawService) {
  if (!rawService) return 'Cloud Services';
  const s = rawService.toLowerCase();
  if (s.includes('m365') || s.includes('microsoft 365') || s.includes('office 365') || s.includes('o365')) return 'Microsoft 365';
  if (s.includes('google') || s.includes('workspace') || s.includes('gsuite') || s.includes('g-suite')) return 'Google Workspace';
  if (s.includes('azure')) return 'Azure Cloud';
  if (s.includes('aws') || s.includes('amazon')) return 'AWS Enterprise';
  if (s.includes('ssl') || s.includes('cert')) return 'SSL Security';
  if (s.includes('domain') || s.includes('dns')) return 'Domains & DNS';
  if (s.includes('backup') || s.includes('veeam') || s.includes('acronis')) return 'Cloud Backup';
  if (s.includes('antivirus') || s.includes('sophos') || s.includes('trend')) return 'Endpoint Security';
  return 'Cloud & IT';
}

function getSubProductTier(rawService, index) {
  const s = rawService.toLowerCase();
  if (s.includes('m365') || s.includes('microsoft 365') || s.includes('office 365')) {
    const tiers = ['Business Basic', 'Business Standard', 'Business Premium', 'Apps Business', 'E3 Enterprise', 'E5 Enterprise'];
    return tiers[index % tiers.length];
  }
  if (s.includes('google') || s.includes('workspace') || s.includes('gsuite')) {
    const tiers = ['Starter Plan', 'Standard Plan', 'Plus Plan', 'Enterprise Plan'];
    return tiers[index % tiers.length];
  }
  if (s.includes('azure')) {
    const tiers = ['VM Compute', 'App Service', 'SQL Database', 'Blob Storage', 'Virtual Network'];
    return tiers[index % tiers.length];
  }
  if (s.includes('aws')) {
    const tiers = ['EC2 Instance', 'S3 Storage', 'RDS Database', 'Route53 DNS'];
    return tiers[index % tiers.length];
  }
  if (s.includes('ssl')) {
    const tiers = ['DV Wildcard', 'OV Single', 'EV Multi-Domain'];
    return tiers[index % tiers.length];
  }
  const tiers = ['Standard Plan', 'Pro Tier', 'Enterprise Pack'];
  return tiers[index % tiers.length];
}

const fromLeaveTransition = ({ endAngle }) => ({
  startAngle: endAngle > Math.PI ? 2 * Math.PI : 0,
  endAngle: endAngle > Math.PI ? 2 * Math.PI : 0,
  opacity: 0,
});

const enterUpdateTransition = ({ startAngle, endAngle }) => ({
  startAngle,
  endAngle,
  opacity: 1,
});

function AnimatedPieSlice({
  arcs,
  path,
  getKey,
  getColor,
  onClickDatum,
  onHoverDatum,
  selectedKey,
}) {
  const transitions = useTransition(arcs, {
    from: fromLeaveTransition,
    enter: enterUpdateTransition,
    update: enterUpdateTransition,
    leave: fromLeaveTransition,
    keys: getKey,
  });

  return transitions((props, arc, { key }) => {
    const isSelected = selectedKey === getKey(arc);

    return (
      <g 
        key={key} 
        className="cursor-pointer transition-all duration-300 hover:opacity-90"
        onMouseEnter={(e) => onHoverDatum && onHoverDatum(arc, e)}
        onMouseLeave={() => onHoverDatum && onHoverDatum(null)}
      >
        <animated.path
          d={interpolate([props.startAngle, props.endAngle], (startAngle, endAngle) =>
            path({
              ...arc,
              startAngle,
              endAngle,
            })
          )}
          fill={getColor(arc)}
          stroke="#ffffff"
          strokeWidth={isSelected ? 3 : 1.5}
          strokeOpacity={isSelected ? 1 : 0.6}
          onClick={() => onClickDatum(arc)}
        />
      </g>
    );
  });
}

export default function ServiceDistributionPieChart({ 
  rawServiceData = [], 
  allRecords = [], 
  chartWidth, 
  chartHeight, 
  onExpand 
}) {
  const containerRef = useRef(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedSubProduct, setSelectedSubProduct] = useState(null);
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Process client records into Service Categories & Sub-Product Plans
  const { categoryData, subProductMap, totalServicesCount } = useMemo(() => {
    const categoryCounts = {};
    const subMap = {};
    let total = 0;

    const records = (allRecords && allRecords.length > 0) ? allRecords : rawServiceData;

    records.forEach((r, idx) => {
      total++;
      const cat = categorizeService(r.service || r.status || 'Other');
      const sub = getSubProductTier(r.service || 'Other', idx);

      categoryCounts[cat] = (categoryCounts[cat] || 0) + (r.count || 1);

      if (!subMap[cat]) subMap[cat] = {};
      subMap[cat][sub] = (subMap[cat][sub] || 0) + (r.count || 1);
    });

    const categoryList = Object.entries(categoryCounts).map(([label, count]) => ({
      label,
      count
    }));

    return {
      categoryData: categoryList,
      subProductMap: subMap,
      totalServicesCount: total || categoryList.reduce((acc, curr) => acc + curr.count, 0)
    };
  }, [rawServiceData, allRecords]);

  // Active Category & Sub-Products
  const activeCategory = selectedService || (categoryData[0]?.label || 'Microsoft 365');

  const activeSubProducts = useMemo(() => {
    const subs = subProductMap[activeCategory] || { 'Standard Plan': 10, 'Enterprise Tier': 5 };
    return Object.entries(subs).map(([label, count]) => ({
      label,
      count
    }));
  }, [subProductMap, activeCategory]);

  const colorScaleCategory = useMemo(() => {
    return scaleOrdinal({
      domain: categoryData.map(c => c.label),
      range: CATEGORY_COLORS,
    });
  }, [categoryData]);

  const colorScaleSubProduct = useMemo(() => {
    return scaleOrdinal({
      domain: activeSubProducts.map(s => s.label),
      range: SUB_PRODUCT_COLORS,
    });
  }, [activeSubProducts]);

  const width = chartWidth || 310;
  const height = chartHeight || 200;
  const radius = Math.min(width, height) / 2 - 8;
  const outerThickness = Math.round(radius * 0.25);
  const innerThickness = Math.round(radius * 0.22);
  const centerX = width / 2;
  const centerY = height / 2;

  const activeCount = selectedService 
    ? (subProductMap[selectedService] ? Object.values(subProductMap[selectedService]).reduce((a, b) => a + b, 0) : 0) 
    : totalServicesCount;

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <h3 className="text-base font-black text-black dark:text-white leading-tight">
            Client Services Breakdown
          </h3>
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Outer: Services | Inner: Product Plan Details
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedService && (
            <button 
              onClick={() => { setSelectedService(null); setSelectedSubProduct(null); }}
              className="text-[10px] bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold px-2.5 py-1 rounded-lg shadow-sm hover:scale-105 transition-all"
            >
              Reset
            </button>
          )}

          {onExpand && (
            <button
              onClick={onExpand}
              className="p-1.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 border border-brand-500/30 transition-all flex items-center gap-1 text-[11px] font-bold"
              title="Open Fullscreen & Detailed Data"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full Screen</span>
            </button>
          )}
        </div>
      </div>

      {/* Visx Concentric Pie Canvas */}
      <div ref={containerRef} className="flex-1 w-full min-h-0 relative flex items-center justify-center py-1">
        <svg width={width} height={height} className="overflow-visible">
          <Group top={centerY} left={centerX}>
            {/* Outer Donut Ring: Primary Client Services */}
            <Pie
              data={categoryData}
              pieValue={(d) => d.count}
              outerRadius={radius}
              innerRadius={radius - outerThickness}
              cornerRadius={3}
              padAngle={0.015}
            >
              {(pie) => (
                <AnimatedPieSlice
                  arcs={pie.arcs}
                  path={pie.path}
                  getKey={(arc) => arc.data.label}
                  getColor={(arc) => colorScaleCategory(arc.data.label)}
                  selectedKey={selectedService}
                  onHoverDatum={(arc, e) => {
                    if (arc && e) {
                      setHoveredSlice(arc.data);
                      setTooltipPos({ x: e.clientX, y: e.clientY });
                    } else {
                      setHoveredSlice(null);
                    }
                  }}
                  onClickDatum={({ data: { label } }) => {
                    setSelectedService(selectedService === label ? null : label);
                    setSelectedSubProduct(null);
                  }}
                />
              )}
            </Pie>

            {/* Inner Donut Ring: Product Plan Tiers */}
            <Pie
              data={activeSubProducts}
              pieValue={(d) => d.count}
              outerRadius={radius - outerThickness - 3}
              innerRadius={radius - outerThickness - 3 - innerThickness}
              cornerRadius={3}
              padAngle={0.02}
            >
              {(pie) => (
                <AnimatedPieSlice
                  arcs={pie.arcs}
                  path={pie.path}
                  getKey={(arc) => arc.data.label}
                  getColor={(arc) => colorScaleSubProduct(arc.data.label)}
                  selectedKey={selectedSubProduct}
                  onHoverDatum={(arc, e) => {
                    if (arc && e) {
                      setHoveredSlice({ label: `${activeCategory} - ${arc.data.label}`, count: arc.data.count });
                      setTooltipPos({ x: e.clientX, y: e.clientY });
                    } else {
                      setHoveredSlice(null);
                    }
                  }}
                  onClickDatum={({ data: { label } }) => {
                    setSelectedSubProduct(selectedSubProduct === label ? null : label);
                  }}
                />
              )}
            </Pie>
          </Group>
        </svg>

        {/* Center Pill Display - Compact HUD */}
        <div className="absolute text-center pointer-events-none flex flex-col items-center justify-center w-[90px] h-[90px] rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/20 shadow-xl backdrop-blur-md p-1">
          <span className="text-xl font-mono font-black text-black dark:text-white leading-none">
            {activeCount}
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mt-0.5 truncate max-w-[75px]">
            {selectedSubProduct || selectedService || 'Total'}
          </span>
        </div>
      </div>

      {/* Sleek Perfectly Aligned Legend Pills */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 border-t border-slate-200/80 dark:border-white/10">
        {categoryData.map((cat, i) => {
          const isSelected = selectedService === cat.label;
          return (
            <button
              key={i}
              onClick={() => {
                setSelectedService(isSelected ? null : cat.label);
                setSelectedSubProduct(null);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-300 text-[11px] font-bold border ${
                isSelected 
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-md scale-105' 
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30 shadow-sm'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colorScaleCategory(cat.label) }} />
              <span className="truncate max-w-[110px]">{cat.label}</span>
              <span className="text-[10px] font-mono opacity-70">({cat.count})</span>
            </button>
          );
        })}
      </div>

      {/* Hover Glass Tooltip */}
      {hoveredSlice && (
        <div 
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 bg-slate-900/95 text-white px-3 py-1.5 rounded-xl border border-white/20 shadow-2xl backdrop-blur-xl text-xs font-bold whitespace-nowrap flex items-center gap-2"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <span>{hoveredSlice.label}</span>
          <span className="bg-brand-500/20 text-brand-300 text-[10px] px-2 py-0.5 rounded-md font-mono">
            {hoveredSlice.count} Units
          </span>
        </div>
      )}
    </div>
  );
}
