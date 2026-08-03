import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { formatCurrency } from '../utils/formatters';

export const background = '#3b6978';
export const background2 = '#204051';
export const accentColor = '#edffea';
export const accentColorDark = '#75daad';

export default function ThreeDGraph({ profit = 0, loss = 0, monthlyData = [] }) {
  const containerRef = useRef(null);
  const mountRef = useRef(null);
  const [webglError, setWebglError] = useState(false);
  const [hoverPos, setHoverPos] = useState(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 350 });

  // Update container dimensions on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerDimensions({
          width: containerRef.current.clientWidth || 800,
          height: containerRef.current.clientHeight || 350,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 1. Setup Three.js WebGL Scene (Grid Floor & Ambient Environment Only - No Cylinders)
  useEffect(() => {
    let renderer;
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglError(true);
        return;
      }
    } catch (e) {
      setWebglError(true);
      return;
    }

    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 350;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x204051, 0.015);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 4.5, 11);
    camera.lookAt(0, 1.2, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xedffea, 1.2);
    dirLight.position.set(6, 12, 8);
    scene.add(dirLight);

    const cyanPointLight = new THREE.PointLight(0x75daad, 1.5, 12);
    cyanPointLight.position.set(0, 4, 3);
    scene.add(cyanPointLight);

    const graphGroup = new THREE.Group();
    scene.add(graphGroup);

    // Grid Floor with Custom Accent Color
    const gridHelper = new THREE.GridHelper(14, 18, 0x75daad, 0x3b6978);
    gridHelper.position.y = 0;
    graphGroup.add(gridHelper);

    // Animation Loop (Smooth Grid Spin)
    let animationFrameId;
    let targetRotationY = 0;
    let currentRotationY = 0;

    const handleMouseMove3D = (event) => {
      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      targetRotationY = x * 0.3;
    };

    container.addEventListener('mousemove', handleMouseMove3D);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (Math.abs(targetRotationY) > 0.01) {
        currentRotationY += (targetRotationY - currentRotationY) * 0.05;
      } else {
        currentRotationY += 0.002;
      }

      graphGroup.rotation.y = currentRotationY;
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove3D);
      cancelAnimationFrame(animationFrameId);

      gridHelper.geometry.dispose();
      if (Array.isArray(gridHelper.material)) gridHelper.material.forEach(m => m.dispose());
      else gridHelper.material?.dispose();

      if (renderer && renderer.domElement) {
        try { container.removeChild(renderer.domElement); } catch (e) {}
        renderer.dispose();
      }
    };
  }, [profit, loss]);

  // Handle Mouse Hover Scanning for Interactive Crosshair
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHoverPos({ x, y });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverPos(null);
  }, []);

  // Compute smooth SVG curve path points
  const points = useMemo(() => {
    const data = (monthlyData && monthlyData.length > 0)
      ? monthlyData
      : [
          { month: 'M1', val: profit * 0.2 },
          { month: 'M2', val: profit * 0.45 },
          { month: 'M3', val: profit * 0.6 },
          { month: 'M4', val: profit * 0.8 },
          { month: 'M5', val: profit }
        ];

    const maxV = Math.max(...data.map(d => d.val || d.revenue || 1), profit, 1);
    const width = containerDimensions.width;
    const height = containerDimensions.height;
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    return data.map((d, i) => {
      const v = d.val || d.revenue || 0;
      const x = margin.left + (i / Math.max(1, data.length - 1)) * innerW;
      const y = margin.top + innerH - (v / maxV) * innerH;
      return { x, y, val: v, label: d.month };
    });
  }, [monthlyData, profit, containerDimensions]);

  // SVG Smooth Path Command
  const svgPathD = useMemo(() => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cpX = (curr.x + next.x) / 2;
      d += ` C ${cpX} ${curr.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
    }
    return d;
  }, [points]);

  const svgAreaD = useMemo(() => {
    if (points.length < 2 || !svgPathD) return '';
    const last = points[points.length - 1];
    const first = points[0];
    const bottomY = containerDimensions.height - 50;
    return `${svgPathD} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [svgPathD, points, containerDimensions.height]);

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full min-h-[360px] overflow-hidden rounded-2xl border border-white/20 shadow-2xl transition-all duration-300"
      style={{
        background: `linear-gradient(135deg, ${background} 0%, ${background2} 100%)`,
      }}
    >
      {/* 2D Visx-Style SVG Area & Grid Overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
        <defs>
          <linearGradient id="area-background-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={background} stopOpacity={0.8} />
            <stop offset="100%" stopColor={background2} stopOpacity={0.95} />
          </linearGradient>
          <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity={0.4} />
            <stop offset="100%" stopColor={accentColorDark} stopOpacity={0.05} />
          </linearGradient>
        </defs>

        {/* Grid Lines */}
        {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => (
          <line
            key={`grid-row-${i}`}
            x1="50"
            y1={containerDimensions.height * ratio}
            x2={containerDimensions.width - 50}
            y2={containerDimensions.height * ratio}
            stroke={accentColor}
            strokeOpacity="0.15"
            strokeDasharray="3 3"
          />
        ))}
        {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => (
          <line
            key={`grid-col-${i}`}
            x1={containerDimensions.width * ratio}
            y1="50"
            x2={containerDimensions.width * ratio}
            y2={containerDimensions.height - 50}
            stroke={accentColor}
            strokeOpacity="0.15"
            strokeDasharray="3 3"
          />
        ))}

        {/* Smooth Area Closed */}
        {svgAreaD && (
          <path d={svgAreaD} fill="url(#area-gradient)" />
        )}

        {/* Monotone Line Curve */}
        {svgPathD && (
          <path 
            d={svgPathD} 
            fill="none" 
            stroke={accentColor} 
            strokeWidth="2.5" 
            strokeLinecap="round"
          />
        )}

        {/* Interactive Hover Crosshair Cursor */}
        {hoverPos && (
          <g>
            {/* Vertical Scanning Line */}
            <line
              x1={hoverPos.x}
              y1="25"
              x2={hoverPos.x}
              y2={containerDimensions.height - 25}
              stroke={accentColorDark}
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            {/* Active Circle Node */}
            <circle
              cx={hoverPos.x}
              cy={hoverPos.y}
              r="6"
              fill={accentColorDark}
              stroke="#ffffff"
              strokeWidth="2.5"
              className="animate-pulse"
            />
          </g>
        )}
      </svg>

      {/* WebGL Grid Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0 opacity-40 pointer-events-none" />

      {/* Floating HUD Tooltip Legend (Top Right) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3 bg-[#204051]/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#75daad] animate-pulse" />
          <span className="text-xs font-bold text-[#edffea]">Profit:</span>
          <span className="text-xs font-mono font-black text-white">{formatCurrency(profit)}</span>
        </div>
        <div className="w-[1px] h-4 bg-white/20" />
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#f43f5e]" />
          <span className="text-xs font-bold text-[#edffea]">Loss (Expired):</span>
          <span className="text-xs font-mono font-black text-rose-300">{formatCurrency(loss)}</span>
        </div>
      </div>

      {/* Floating Interactive Mouse Tooltip (Visx Style) */}
      {hoverPos && (
        <div 
          className="pointer-events-none absolute z-30 transform -translate-x-1/2 -translate-y-full mb-3 bg-[#204051] border border-white/40 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-md"
          style={{ top: hoverPos.y - 10, left: hoverPos.x }}
        >
          <span className="text-[#edffea] font-mono">{formatCurrency(profit)}</span>
        </div>
      )}
    </div>
  );
}
