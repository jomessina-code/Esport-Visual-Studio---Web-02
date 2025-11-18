import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { ManualTextLayer, PartnerZoneConfig, PartnerLogo } from '../../types';

interface DraggableTextOverlayProps {
  layers: ManualTextLayer[];
  selectedLayerId: string | null;
  onLayerSelect: (id: string | null) => void;
  onLayerUpdate: (id: string, updates: Partial<ManualTextLayer>) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  readOnly?: boolean;
  referenceHeight?: number;
  partnerZone: PartnerZoneConfig | null;
  partnerLogos: PartnerLogo[];
  onPartnerZoneUpdate: React.Dispatch<React.SetStateAction<PartnerZoneConfig | null>>;
  onPartnerLogosUpdate: React.Dispatch<React.SetStateAction<PartnerLogo[]>>;
  isExporting?: boolean;
}

const SNAP_THRESHOLD = 1; // Threshold in percentage for snapping to guides

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const colorToRgba = (color: string, alpha: number): string => {
    if (!color) return `rgba(20, 20, 20, ${alpha})`;
    // Handle HSL(A) colors from the picker
    if (color.trim().startsWith('hsl')) {
        return color.replace('hsl', 'hsla').replace(')', `, ${alpha})`);
    }
    // Handle HEX colors
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(color)) {
        let c: any = color.substring(1).split('');
        if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',')},${alpha})`;
    }
    // Fallback for invalid formats
    return `rgba(20, 20, 20, ${alpha})`;
};


const DraggableTextOverlay: React.FC<DraggableTextOverlayProps> = ({
  layers,
  selectedLayerId,
  onLayerSelect,
  onLayerUpdate,
  containerRef,
  readOnly = false,
  referenceHeight,
  partnerZone,
  partnerLogos,
  onPartnerZoneUpdate,
  onPartnerLogosUpdate,
  isExporting = false,
}) => {
    const [measuredHeight, setMeasuredHeight] = useState(0);
    const [activeCanvasGuides, setActiveCanvasGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
    const [activeZoneGuides, setActiveZoneGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });

    const [selectedPartnerElementId, setSelectedPartnerElementId] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const layerRefs = useRef<Record<string, HTMLDivElement | null>>({});
    
    const interactionRef = useRef<{
        type: 'drag-zone' | 'resize-zone' | 'drag-logo-in-zone' | 'resize-logo-in-zone' | 'drag-logo-on-canvas' | 'resize-logo-on-canvas' | 'drag-text';
        id: string;
        handle?: string;
        initialRect: DOMRect;
        initialZone?: PartnerZoneConfig;
        initialLogo?: PartnerLogo;
        initialLayer?: ManualTextLayer;
        startX: number;
        startY: number;
    } | null>(null);

    const heightToUse = referenceHeight || measuredHeight;

    const { zoneLogos, canvasLogos } = useMemo(() => {
        const zoneL: PartnerLogo[] = [];
        const canvasL: PartnerLogo[] = [];
        partnerLogos.forEach(logo => {
            if ((logo.container ?? 'zone') === 'canvas') {
                canvasL.push(logo);
            } else {
                zoneL.push(logo);
            }
        });
        return { zoneLogos: zoneL, canvasLogos: canvasL };
    }, [partnerLogos]);

    useEffect(() => {
        if (!containerRef.current || referenceHeight) return;
        
        const updateHeight = () => {
            if (containerRef.current) setMeasuredHeight(containerRef.current.clientHeight);
        };
        requestAnimationFrame(updateHeight);
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) setMeasuredHeight(entry.contentRect.height);
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [containerRef, referenceHeight]);

    const handleTextLayerPointerDown = (e: React.PointerEvent<HTMLDivElement>, layerId: string) => {
        if (readOnly || editingId === layerId) return;
        e.stopPropagation();
        e.preventDefault();
        
        const container = containerRef.current;
        if (!container) return;

        const layer = layers.find(l => l.id === layerId);
        if (layer) {
            onLayerSelect(layerId);
            setSelectedPartnerElementId(null);
            const element = e.currentTarget;
            element.setPointerCapture(e.pointerId);

            interactionRef.current = {
                type: 'drag-text',
                id: layerId,
                initialRect: container.getBoundingClientRect(),
                initialLayer: { ...layer },
                startX: e.clientX,
                startY: e.clientY
            };
        }
    };

    const handleInteractionStart = (
        e: React.PointerEvent,
        type: 'drag-zone' | 'resize-zone' | 'drag-logo-in-zone' | 'resize-logo-in-zone' | 'drag-logo-on-canvas' | 'resize-logo-on-canvas',
        id: string,
        handle?: string
    ) => {
        if (readOnly || isExporting) return;
        e.preventDefault();
        e.stopPropagation();

        const container = containerRef.current;
        if (!container) return;

        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        
        interactionRef.current = {
            type, id, handle,
            initialRect: container.getBoundingClientRect(),
            initialZone: partnerZone ? { ...partnerZone } : undefined,
            initialLogo: partnerLogos.find(l => l.id === id),
            startX: e.clientX,
            startY: e.clientY,
        };
    };

    const handleGlobalPointerMove = (e: React.PointerEvent) => {
        if (!interactionRef.current) return;
        const { type, id, handle, initialRect, startX, startY } = interactionRef.current;
        const dx = (e.clientX - startX);
        const dy = (e.clientY - startY);
        const dxPercent = dx / initialRect.width * 100;
        const dyPercent = dy / initialRect.height * 100;

        setActiveCanvasGuides({ x: [], y: [] });
        setActiveZoneGuides({ x: [], y: [] });

        if (type === 'drag-text' || type === 'drag-logo-on-canvas') {
            const initialElement = type === 'drag-text' ? interactionRef.current.initialLayer : interactionRef.current.initialLogo;
            if (!initialElement) return;

            let finalX = initialElement.x + dxPercent;
            let finalY = initialElement.y + dyPercent;

            const draggedElement = layerRefs.current[id];
            const guides = { x: [], y: [] };
            const isText = type === 'drag-text';

            if (draggedElement) {
                const draggedHalfWidth = (draggedElement.offsetWidth / initialRect.width) * 50;
                const draggedHalfHeight = (draggedElement.offsetHeight / initialRect.height) * 50;
        
                finalX = clamp(finalX, draggedHalfWidth, 100 - draggedHalfWidth);
                finalY = clamp(finalY, draggedHalfHeight, 100 - draggedHalfHeight);
        
                const draggedPoints = { h: [finalX - draggedHalfWidth, finalX, finalX + draggedHalfWidth], v: [finalY - draggedHalfHeight, finalY, finalY + draggedHalfHeight] };
                const allGuides = { h: [0, 50, 100], v: [0, 50, 100] };

                layers.filter(l => l.isVisible && (isText ? l.id !== id : true)).forEach(otherLayer => {
                    const otherElement = layerRefs.current[otherLayer.id];
                    if (!otherElement) return;
                    const otherHalfWidth = (otherElement.offsetWidth / initialRect.width) * 50;
                    const otherHalfHeight = (otherElement.offsetHeight / initialRect.height) * 50;
                    allGuides.h.push(otherLayer.x - otherHalfWidth, otherLayer.x, otherLayer.x + otherHalfWidth);
                    allGuides.v.push(otherLayer.y - otherHalfHeight, otherLayer.y, otherLayer.y + otherHalfHeight);
                });
                
                canvasLogos.filter(l => l.isVisible && (!isText ? l.id !== id : true)).forEach(otherLogo => {
                    const otherElement = layerRefs.current[otherLogo.id];
                    if (!otherElement) return;
                    const otherHalfWidth = (otherElement.offsetWidth / initialRect.width) * 50;
                    const otherHalfHeight = (otherElement.offsetHeight / initialRect.height) * 50;
                    allGuides.h.push(otherLogo.x - otherHalfWidth, otherLogo.x, otherLogo.x + otherHalfWidth);
                    allGuides.v.push(otherLogo.y - otherHalfHeight, otherLogo.y, otherLogo.y + otherHalfHeight);
                });

                let bestSnap = { h: { dist: SNAP_THRESHOLD, delta: 0, guide: 0 }, v: { dist: SNAP_THRESHOLD, delta: 0, guide: 0 } };
                for (const point of draggedPoints.h) for (const guide of allGuides.h) { const dist = Math.abs(point - guide); if (dist < bestSnap.h.dist) bestSnap.h = { dist, delta: guide - point, guide }; }
                for (const point of draggedPoints.v) for (const guide of allGuides.v) { const dist = Math.abs(point - guide); if (dist < bestSnap.v.dist) bestSnap.v = { dist, delta: guide - point, guide }; }

                if (bestSnap.h.dist < SNAP_THRESHOLD) { finalX += bestSnap.h.delta; guides.x.push(bestSnap.h.guide); }
                if (bestSnap.v.dist < SNAP_THRESHOLD) { finalY += bestSnap.v.delta; guides.y.push(bestSnap.v.guide); }
            }

            setActiveCanvasGuides({ x: [...new Set(guides.x)], y: [...new Set(guides.y)] });
            if (isText) {
                onLayerUpdate(id, { x: finalX, y: finalY });
            } else {
                onPartnerLogosUpdate(prev => prev.map(l => l.id === id ? { ...l, x: finalX, y: finalY } : l));
            }
            return;
        }

        const { initialZone, initialLogo } = interactionRef.current;
        
        switch(type) {
            case 'drag-zone': {
                if (!initialZone) return;
                let finalX = initialZone.x + dxPercent;
                let finalY = initialZone.y + dyPercent;

                const zoneHalfWidth = initialZone.width / 2;
                const zoneHalfHeight = initialZone.height / 2;

                finalX = clamp(finalX, zoneHalfWidth, 100 - zoneHalfWidth);
                finalY = clamp(finalY, zoneHalfHeight, 100 - zoneHalfHeight);

                const guides = { x: [], y: [] };
                const draggedPoints = { h: [finalX - zoneHalfWidth, finalX, finalX + zoneHalfWidth], v: [finalY - zoneHalfHeight, finalY, finalY + zoneHalfHeight] };
                const allGuides = { h: [0, 50, 100], v: [0, 50, 100] };

                // Snap to canvas items
                [...layers.filter(l => l.isVisible), ...canvasLogos.filter(l => l.isVisible)].forEach(item => {
                    const element = layerRefs.current[item.id];
                    if (!element) return;
                    const halfWidth = (element.offsetWidth / initialRect.width) * 50;
                    const halfHeight = (element.offsetHeight / initialRect.height) * 50;
                    allGuides.h.push(item.x - halfWidth, item.x, item.x + halfWidth);
                    allGuides.v.push(item.y - halfHeight, item.y, item.y + halfHeight);
                });

                let bestSnap = { h: { dist: SNAP_THRESHOLD, delta: 0, guide: 0 }, v: { dist: SNAP_THRESHOLD, delta: 0, guide: 0 } };
                for (const point of draggedPoints.h) for (const guide of allGuides.h) { const dist = Math.abs(point - guide); if (dist < bestSnap.h.dist) bestSnap.h = { dist, delta: guide - point, guide }; }
                for (const point of draggedPoints.v) for (const guide of allGuides.v) { const dist = Math.abs(point - guide); if (dist < bestSnap.v.dist) bestSnap.v = { dist, delta: guide - point, guide }; }
                
                if (bestSnap.h.dist < SNAP_THRESHOLD) { finalX += bestSnap.h.delta; guides.x.push(bestSnap.h.guide); }
                if (bestSnap.v.dist < SNAP_THRESHOLD) { finalY += bestSnap.v.delta; guides.y.push(bestSnap.v.guide); }

                setActiveCanvasGuides({ x: [...new Set(guides.x)], y: [...new Set(guides.y)] });
                onPartnerZoneUpdate({ ...initialZone, x: finalX, y: finalY });
                break;
            }
            case 'drag-logo-in-zone':
                if (initialLogo && partnerZone && initialZone) {
                    const zoneWidthPx = initialRect.width * (initialZone.width / 100);
                    const zoneHeightPx = heightToUse * (initialZone.height / 100);
                    const dxPercentInZone = zoneWidthPx > 0 ? (dx / zoneWidthPx * 100) : 0;
                    const dyPercentInZone = zoneHeightPx > 0 ? (dy / zoneHeightPx * 100) : 0;
                    
                    let newX = initialLogo.x + dxPercentInZone;
                    let newY = initialLogo.y + dyPercentInZone;
                    
                    const logoWidthPx = zoneWidthPx * (initialLogo.width / 100);
                    const logoHeightPx = logoWidthPx / initialLogo.aspectRatio;
                    const logoHeightPercentOfZone = zoneHeightPx > 0 ? (logoHeightPx / zoneHeightPx) * 100 : 0;
                    
                    newX = clamp(newX, 0, 100 - initialLogo.width);
                    newY = clamp(newY, 0, 100 - logoHeightPercentOfZone);

                    let zoneGuides = { x: [], y: [] };
                    const logoHCenter = newX + initialLogo.width / 2;
                    const logoVCenter = newY + logoHeightPercentOfZone / 2;

                    if (Math.abs(logoHCenter - 50) < SNAP_THRESHOLD) { newX = 50 - initialLogo.width / 2; zoneGuides.x.push(50); }
                    if (Math.abs(newY - 0) < SNAP_THRESHOLD) { newY = 0; zoneGuides.y.push(0); }
                    if (Math.abs(logoVCenter - 50) < SNAP_THRESHOLD) { newY = 50 - logoHeightPercentOfZone / 2; zoneGuides.y.push(50); }
                    if (Math.abs((newY + logoHeightPercentOfZone) - 100) < SNAP_THRESHOLD) { newY = 100 - logoHeightPercentOfZone; zoneGuides.y.push(100); }
                    
                    const draggedRect = { l: newX, c: logoHCenter, r: newX + initialLogo.width, t: newY, m: logoVCenter, b: newY + logoHeightPercentOfZone };

                    zoneLogos.filter(l => l.id !== id).forEach(other => {
                        const otherW = other.width;
                        const otherHPerc = zoneHeightPx > 0 ? ((zoneWidthPx * (otherW / 100) / other.aspectRatio) / zoneHeightPx * 100) : 0;
                        const otherRect = { l: other.x, c: other.x + otherW/2, r: other.x + otherW, t: other.y, m: other.y + otherHPerc/2, b: other.y + otherHPerc };
                        
                        if(Math.abs(draggedRect.l - otherRect.l) < SNAP_THRESHOLD) { newX = otherRect.l; zoneGuides.x.push(otherRect.l); }
                        if(Math.abs(draggedRect.c - otherRect.c) < SNAP_THRESHOLD) { newX = otherRect.c - initialLogo.width/2; zoneGuides.x.push(otherRect.c); }
                        if(Math.abs(draggedRect.r - otherRect.r) < SNAP_THRESHOLD) { newX = otherRect.r - initialLogo.width; zoneGuides.x.push(otherRect.r); }
                        if(Math.abs(draggedRect.t - otherRect.t) < SNAP_THRESHOLD) { newY = otherRect.t; zoneGuides.y.push(otherRect.t); }
                        if(Math.abs(draggedRect.m - otherRect.m) < SNAP_THRESHOLD) { newY = otherRect.m - logoHeightPercentOfZone/2; zoneGuides.y.push(otherRect.m); }
                        if(Math.abs(draggedRect.b - otherRect.b) < SNAP_THRESHOLD) { newY = otherRect.b - logoHeightPercentOfZone; zoneGuides.y.push(otherRect.b); }
                    });

                    setActiveZoneGuides(zoneGuides);
                    onPartnerLogosUpdate(partnerLogos.map(l => l.id === id ? { ...l, x: newX, y: newY } : l));
                }
                break;
            case 'resize-zone': {
                if (!initialZone) return;
                let { x, y, width, height } = initialZone;
                if (handle?.includes('right')) width = clamp(initialZone.width + dxPercent, 10, 100 - x + width/2);
                if (handle?.includes('left')) width = clamp(initialZone.width - dxPercent, 10, 100);
                if (handle?.includes('bottom')) height = clamp(initialZone.height + dyPercent, 5, 100);
                if (handle?.includes('top')) height = clamp(initialZone.height - dyPercent, 5, 100);
                if (handle?.includes('left')) x = initialZone.x + dxPercent;
                if (handle?.includes('top')) y = initialZone.y + dyPercent;
                onPartnerZoneUpdate({ ...initialZone, x, y, width, height });
                break;
            }
            case 'resize-logo-on-canvas':
            case 'resize-logo-in-zone': {
                if (!initialLogo || !handle) break;
                const isCanvas = type === 'resize-logo-on-canvas';
                const containerWidth = isCanvas ? initialRect.width : (initialRect.width * (initialZone?.width ?? 100) / 100);
                const containerHeight = isCanvas ? initialRect.height : (initialRect.height * (initialZone?.height ?? 100) / 100);

                const initialWidthPx = (initialLogo.width / 100) * containerWidth;
                let widthChangePx = 0;
                
                if (handle.length > 5) { // Diagonal
                    widthChangePx = handle.includes('left') ? -dx : dx;
                } else { // Cardinal
                    if (handle.includes('left') || handle.includes('right')) widthChangePx = handle.includes('left') ? -dx : dx;
                    else widthChangePx = (handle.includes('top') ? -dy : dy) * initialLogo.aspectRatio;
                }

                const newWidthPx = Math.max(20, initialWidthPx + widthChangePx);
                const newWidthPercent = containerWidth > 0 ? (newWidthPx / containerWidth) * 100 : 0;
                
                const finalWidth = clamp(newWidthPercent, 2, 100);

                onPartnerLogosUpdate(prev => prev.map(l => l.id === id ? { ...l, width: finalWidth } : l));
                break;
            }
        }
    };
    
    const handleGlobalPointerUp = (e: PointerEvent) => {
        if (!interactionRef.current) return;
        setActiveCanvasGuides({x: [], y: []});
        setActiveZoneGuides({x: [], y: []});
        interactionRef.current = null;
        
        const target = e.target as HTMLElement;
        if (target.hasPointerCapture && target.hasPointerCapture(e.pointerId)) {
            target.releasePointerCapture(e.pointerId);
        }
    };
    
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        
        const upHandler = (e: PointerEvent) => handleGlobalPointerUp(e);
        const moveHandler = (e: PointerEvent) => handleGlobalPointerMove(e as any);
        
        document.addEventListener('pointermove', moveHandler);
        document.addEventListener('pointerup', upHandler);
        
        return () => {
            document.removeEventListener('pointermove', moveHandler);
            document.removeEventListener('pointerup', upHandler);
        };
    }, [containerRef.current, layers, partnerZone, partnerLogos, onLayerUpdate, onPartnerZoneUpdate, onPartnerLogosUpdate]);


    const handleContainerClick = (e: React.MouseEvent) => {
        if (!readOnly && e.target === e.currentTarget) {
            onLayerSelect(null);
            setSelectedPartnerElementId(null);
            setEditingId(null);
        }
    };

    const getEffectStyles = (layer: ManualTextLayer): React.CSSProperties => {
      switch (layer.effect) {
          case 'shadow': return { textShadow: '0.08em 0.08em 0.05em rgba(0,0,0,1)' };
          case 'outline': return { WebkitTextStroke: '0.08em black', textShadow: '0 0 1px black' };
          case 'neon': return { textShadow: `0 0 0.8em ${layer.color}, 0 0 0.4em ${layer.color}, 0 0 0.1em #FFFFFF` };
          default: return { textShadow: '0.05em 0.05em 0.1em rgba(0,0,0,0.5)' };
      }
    };

    const renderResizeHandles = (id: string, isZone: boolean, isCanvasLogo: boolean) => {
        if (isExporting || (isZone && !partnerZone?.isVisible)) return null;
        const handles = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        const cursors: { [key: string]: string } = { 'top-left': 'cursor-nwse-resize', 'top-right': 'cursor-nesw-resize', 'bottom-left': 'cursor-nesw-resize', 'bottom-right': 'cursor-nwse-resize' };
        let type: 'resize-zone' | 'resize-logo-in-zone' | 'resize-logo-on-canvas' = 'resize-zone';
        if (!isZone) {
            type = isCanvasLogo ? 'resize-logo-on-canvas' : 'resize-logo-in-zone';
        }
        return handles.map(handle => (
            <div
                key={handle}
                className={`absolute w-2.5 h-2.5 bg-white border border-gray-800 rounded-full z-30 ${cursors[handle]}`}
                style={{
                    top: handle.includes('top') ? '0%' : '100%',
                    left: handle.includes('left') ? '0%' : '100%',
                    transform: `translate(${handle.includes('left') ? '-50%' : '-50%'}, ${handle.includes('top') ? '-50%' : '-50%'})`,
                }}
                onPointerDown={e => handleInteractionStart(e, type, id, handle)}
            />
        ));
    };

    if (heightToUse === 0 || !containerRef.current) return null;
    
    const { backgroundColor = '#141414', borderRadius = 10, opacity = 0.1, borderWidth = 0, borderColor = 'transparent', shadowBlur = 0, shadowColor = 'transparent', shadowSpread = 0 } = partnerZone || {};
    const zoneHeightPx = heightToUse * ((partnerZone?.height || 0) / 100);
    const borderRadiusPx = zoneHeightPx * (borderRadius / 100);
    const isZoneSelected = selectedPartnerElementId === 'zone';

    const partnerZoneStyle: React.CSSProperties = {
        left: `${(partnerZone?.x ?? 50) - (partnerZone?.width ?? 80) / 2}%`,
        top: `${(partnerZone?.y ?? 85) - (partnerZone?.height ?? 15) / 2}%`,
        width: `${partnerZone?.width ?? 80}%`,
        height: `${partnerZone?.height ?? 15}%`,
        backgroundColor: colorToRgba(backgroundColor, opacity),
        border: `${borderWidth}px solid ${borderColor}`,
        boxShadow: `0 0 ${shadowBlur}px ${shadowSpread}px ${shadowColor}`,
        borderRadius: `${borderRadiusPx}px`,
        touchAction: 'none',
        cursor: readOnly || isExporting ? 'default' : 'move',
    };
    
    return (
        <div 
            className={`absolute inset-0 z-10 overflow-hidden ${!readOnly ? 'cursor-crosshair' : ''}`}
            onClick={handleContainerClick}
        >
            {!readOnly && activeCanvasGuides.x.map(x => <div key={`cgx-${x}`} className="absolute top-0 bottom-0 border-l border-dashed z-0 pointer-events-none" style={{ left: `${x}%`, borderColor: '#a855f7', borderWidth: '1px', opacity: 0.8 }}/>)}
            {!readOnly && activeCanvasGuides.y.map(y => <div key={`cgy-${y}`} className="absolute left-0 right-0 border-t border-dashed z-0 pointer-events-none" style={{ top: `${y}%`, borderColor: '#a855f7', borderWidth: '1px', opacity: 0.8 }}/>)}

            {layers.filter(l => l.isVisible && l.text.trim()).map((layer) => (
                <div key={layer.id} ref={el => { layerRefs.current[layer.id] = el; }} onPointerDown={(e) => handleTextLayerPointerDown(e, layer.id)} onDoubleClick={(e) => { if (!readOnly) { e.stopPropagation(); setEditingId(layer.id); onLayerSelect(layer.id); } }} onClick={(e) => e.stopPropagation()} className={`absolute transform -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap px-2 rounded transition-colors flex items-center justify-center z-10 ${!readOnly && selectedLayerId === layer.id ? 'ring-1 ring-purple-400/50' : ''} ${!readOnly ? 'hover:bg-white/5 cursor-move' : ''}`} style={{ left: `${layer.x}%`, top: `${layer.y}%`, fontFamily: `"${layer.fontFamily}", sans-serif`, fontSize: `${(heightToUse * layer.fontSize) / 100}px`, fontWeight: 700, color: layer.color, touchAction: 'none', lineHeight: 1, ...getEffectStyles(layer) }}>
                    {editingId === layer.id && !readOnly ? <input type="text" value={layer.text} onChange={(e) => onLayerUpdate(layer.id, { text: e.target.value })} onBlur={() => setEditingId(null)} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} autoFocus style={{ background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', color: 'inherit', font: 'inherit', textShadow: 'none', padding: 0, margin: 0, width: 'auto', minWidth: '1ch' }} onPointerDown={(e) => e.stopPropagation()} /> : layer.text}
                </div>
            ))}

            {canvasLogos.filter(l => l.isVisible).map(logo => (
                <div key={logo.id} ref={el => { layerRefs.current[logo.id] = el; }} className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10" style={{ left: `${logo.x}%`, top: `${logo.y}%`, width: `${logo.width}%`, touchAction: 'none', cursor: readOnly || isExporting ? 'default' : 'move' }} onPointerDown={e => { if (readOnly || isExporting) return; onLayerSelect(null); setSelectedPartnerElementId(logo.id); handleInteractionStart(e, 'drag-logo-on-canvas', logo.id); }}>
                    <img src={logo.src} alt={logo.name} className="w-full h-auto object-contain pointer-events-none" style={{ aspectRatio: logo.aspectRatio }} />
                    {!isExporting && selectedPartnerElementId === logo.id && (<> <div className="absolute inset-0 ring-1 ring-purple-400/50 pointer-events-none" /> {renderResizeHandles(logo.id, false, true)} </>)}
                </div>
            ))}

            {partnerZone && partnerZone.isVisible &&
                <div className={`absolute transition-colors`} style={partnerZoneStyle} onPointerDown={e => { if (readOnly || isExporting) return; onLayerSelect(null); setSelectedPartnerElementId('zone'); handleInteractionStart(e, 'drag-zone', 'zone'); }}>
                    {!isExporting && (<div className={`absolute inset-0 transition-opacity duration-200 pointer-events-none ${isZoneSelected ? 'opacity-100' : 'opacity-0'}`} style={{ border: '1px dashed #a855f7' }} />)}
                    {!readOnly && activeZoneGuides.x.map(x => <div key={`zgx-${x}`} className="absolute top-0 bottom-0 border-l border-dashed z-0 pointer-events-none" style={{ left: `${x}%`, borderColor: '#a855f7', borderWidth: '1px', opacity: 0.8 }}/>)}
                    {!readOnly && activeZoneGuides.y.map(y => <div key={`zgy-${y}`} className="absolute left-0 right-0 border-t border-dashed z-0 pointer-events-none" style={{ top: `${y}%`, borderColor: '#a855f7', borderWidth: '1px', opacity: 0.8 }}/>)}

                    {zoneLogos.filter(l => l.isVisible).map(logo => {
                        const zoneWidthPx = (containerRef.current?.clientWidth || 0) * (partnerZone.width / 100);
                        const zoneHeightPx = heightToUse * (partnerZone.height / 100);
                        const logoWidthPx = zoneWidthPx * (logo.width / 100);
                        const logoHeightPx = logoWidthPx / logo.aspectRatio;
                        const logoHeightPercentOfZone = zoneHeightPx > 0 ? (logoHeightPx / zoneHeightPx) * 100 : 0;

                        return (
                            <div key={logo.id} className="absolute z-20" style={{ left: `${logo.x}%`, top: `${logo.y}%`, width: `${logo.width}%`, height: `${logoHeightPercentOfZone}%`, touchAction: 'none', cursor: readOnly || isExporting ? 'default' : 'move' }} onPointerDown={e => { if (readOnly || isExporting) return; onLayerSelect(null); setSelectedPartnerElementId(logo.id); handleInteractionStart(e, 'drag-logo-in-zone', logo.id); }}>
                                <img src={logo.src} alt={logo.name} className="w-full h-full object-contain pointer-events-none" />
                                {!isExporting && selectedPartnerElementId === logo.id && (<> <div className="absolute inset-0 ring-1 ring-purple-400/50 pointer-events-none" /> {renderResizeHandles(logo.id, false, false)} </>)}
                            </div>
                        )
                    })}
                    {!isExporting && isZoneSelected && renderResizeHandles('zone', true, false)}
                </div>
            }
        </div>
    );
};

export default DraggableTextOverlay;