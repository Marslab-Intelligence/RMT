import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { formatCurrency } from '../utils/formatters';

export default function ThreeDGraph({ profit, loss }) {
  const mountRef = useRef(null);
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    // 1. WebGL Support check
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

    // 2. Setup Scene, Camera, and Renderer
    const container = mountRef.current;
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0f172a, 0.015);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 5, 12);
    camera.lookAt(0, 1.5, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    // 3. Add Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x8b5cf6, 1, 10);
    pointLight.position.set(0, 4, 2);
    scene.add(pointLight);

    // 4. Compute Heights scale
    const maxVal = Math.max(profit, loss, 1);
    const profitHeight = (profit / maxVal) * 4;
    const lossHeight = (loss / maxVal) * 4;

    // Create Group to hold components for auto-rotation
    const graphGroup = new THREE.Group();
    scene.add(graphGroup);

    // 5. Add Grid / Base Floor
    const gridHelper = new THREE.GridHelper(10, 10, 0x8b5cf6, 0x334155);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // 6. Create Profit Cylinder (Emerald Green)
    const profitGeometry = new THREE.CylinderGeometry(0.6, 0.6, Math.max(profitHeight, 0.1), 32);
    const profitMaterial = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.9,
    });
    const profitMesh = new THREE.Mesh(profitGeometry, profitMaterial);
    profitMesh.position.set(-1.8, Math.max(profitHeight, 0.1) / 2, 0);
    profitMesh.castShadow = true;
    profitMesh.receiveShadow = true;
    graphGroup.add(profitMesh);

    // Create Loss Cylinder (Rose Red)
    const lossGeometry = new THREE.CylinderGeometry(0.6, 0.6, Math.max(lossHeight, 0.1), 32);
    const lossMaterial = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.9,
    });
    const lossMesh = new THREE.Mesh(lossGeometry, lossMaterial);
    lossMesh.position.set(1.8, Math.max(lossHeight, 0.1) / 2, 0);
    lossMesh.castShadow = true;
    lossMesh.receiveShadow = true;
    graphGroup.add(lossMesh);

    // 7. Interactive animation loop
    let animationFrameId;
    let targetRotationY = 0;
    let currentRotationY = 0;

    const handleMouseMove = (event) => {
      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      targetRotationY = x * 0.5;
    };

    container.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth rotation towards target or passive auto-rotation
      if (Math.abs(targetRotationY) > 0.01) {
        currentRotationY += (targetRotationY - currentRotationY) * 0.05;
      } else {
        currentRotationY += 0.005; // Passive spin
      }

      graphGroup.rotation.y = currentRotationY;

      // Small bounce / pulse animation
      const elapsed = Date.now() * 0.001;
      profitMesh.position.y = (Math.max(profitHeight, 0.1) / 2) + Math.sin(elapsed * 2) * 0.05;
      lossMesh.position.y = (Math.max(lossHeight, 0.1) / 2) + Math.cos(elapsed * 2) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // 8. Handle Resizing
    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (container && handleMouseMove) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
      cancelAnimationFrame(animationFrameId);

      // Dispose resources
      profitGeometry.dispose();
      profitMaterial.dispose();
      lossGeometry.dispose();
      lossMaterial.dispose();
      gridHelper.geometry.dispose();
      if (Array.isArray(gridHelper.material)) {
        gridHelper.material.forEach(m => m.dispose());
      } else {
        gridHelper.material.dispose();
      }

      if (renderer && renderer.domElement) {
        try {
          container.removeChild(renderer.domElement);
        } catch (e) {}
        renderer.dispose();
      }
    };
  }, [profit, loss]);

  if (webglError) {
    // Elegant fallback 2D UI when WebGL fails
    const maxVal = Math.max(profit, loss, 1);
    const profitPct = Math.min(100, Math.max(5, (profit / maxVal) * 100));
    const lossPct = Math.min(100, Math.max(5, (loss / maxVal) * 100));

    return (
      <div className="flex flex-col justify-center items-center h-full w-full bg-surface-50 dark:bg-surface-900/10 rounded-xl p-8 border border-surface-200 dark:border-surface-800">
        <div className="flex justify-around items-end w-full max-w-sm h-48 border-b-2 border-surface-300 dark:border-surface-700 pb-2">
          {/* Profit Bar */}
          <div className="flex flex-col items-center w-1/3 group">
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {formatCurrency(profit)}
            </div>
            <div 
              style={{ height: `${profitPct}%` }} 
              className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-500 shadow-lg shadow-emerald-500/10"
            />
            <span className="text-xs mt-2 font-semibold text-surface-600 dark:text-surface-400">Profit</span>
          </div>

          {/* Loss Bar */}
          <div className="flex flex-col items-center w-1/3 group">
            <div className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {formatCurrency(loss)}
            </div>
            <div 
              style={{ height: `${lossPct}%` }} 
              className="w-full bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-lg transition-all duration-500 shadow-lg shadow-rose-500/10"
            />
            <span className="text-xs mt-2 font-semibold text-surface-600 dark:text-surface-400">Loss</span>
          </div>
        </div>
        <div className="mt-4 text-[10px] text-surface-400 dark:text-surface-500">
          Showing 2D comparison fallback (WebGL disabled/unsupported)
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex justify-center items-center">
      <div ref={mountRef} className="w-full h-full min-h-[250px]" />
      {/* Floating HUD overlay legends */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 bg-surface-900/80 dark:bg-surface-950/80 backdrop-blur-md px-3 py-2.5 rounded-lg border border-surface-800 text-[10px] text-white">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="font-semibold text-white">Total Profit:</span>
          <span className="font-mono text-emerald-400">{formatCurrency(profit)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span className="font-semibold text-white">Total Loss:</span>
          <span className="font-mono text-rose-400">{formatCurrency(loss)}</span>
        </div>
      </div>
    </div>
  );
}
