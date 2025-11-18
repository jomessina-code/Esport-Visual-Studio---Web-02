import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { EsportPromptOptions, Format, DerivedImage, AdaptationRequest, CropArea, UniversePreset, ManualTextLayer, PartnerZoneConfig, PartnerLogo } from '../types';
import { DECLINATION_FORMATS, FormatDefinition } from '../constants/formats';
import SpinnerIcon from './icons/SpinnerIcon';
import DownloadIcon from './icons/DownloadIcon';
import DraggableTextOverlay from './TextOverlay/DraggableTextOverlay';
import ManualTextEditor from './TextOverlay/ManualTextEditor';
import PencilIcon from './icons/PencilIcon';
import { toPng } from 'html-to-image';
import FullScreenIcon from './icons/FullScreenIcon';
import MinimizeIcon from './icons/MinimizeIcon';

interface FormatManagerProps {
  isOpen: boolean;
  onClose: () => void;
  mainImageSrc: string;
  mainImageOptions: EsportPromptOptions;
  onGenerate: (adaptations: AdaptationRequest[]) => void;
  isGenerating: boolean;
  derivedImages: Record<Format, DerivedImage>;
  setDerivedImages: React.Dispatch<React.SetStateAction<Record<Format, DerivedImage>>>;
  allPresets: UniversePreset[];
  textLayers: ManualTextLayer[];
  partnerZone: PartnerZoneConfig | null;
  partnerLogos: PartnerLogo[];
}

declare const JSZip: any;

// Utility to get numeric dimensions from format definition string "WxHpx"
const getDimensions = (formatDef: FormatDefinition) => {
    const [width, height] = formatDef.dimensions.replace('px', '').split('x').map(Number);
    return { width, height };
};

const FormatManager: React.FC<FormatManagerProps> = ({
  isOpen,
  onClose,
  mainImageSrc,
  mainImageOptions,
  onGenerate,
  isGenerating,
  derivedImages,
  setDerivedImages,
  allPresets,
  textLayers,
  partnerZone,
  partnerLogos,
}) => {
  const [selectedFormats, setSelectedFormats] = useState<Set<Format>>(new Set());
  const [isZipping, setIsZipping] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<Format | null>(null);
  
  // Crop states for various formats
  const [bannerCrop, setBannerCrop] = useState<CropArea>({ y: 1/3 }); 

  const [landscapeCrop, setLandscapeCrop] = useState<CropArea>({ y: (1 - 9 / 16) / 2 });

  const [portraitCrop, setPortraitCrop] = useState<CropArea>({ x: (1 - 4/5) / 2 });

  const [afficheCrop, setAfficheCrop] = useState<CropArea>({ x: (1 - 2/3) / 2 });

  const [storyCrop, setStoryCrop] = useState<CropArea>({ x: (1 - 9/16) / 2 });

  // Store adapted text layers for each format
  const [derivedTextLayers, setDerivedTextLayers] = useState<Partial<Record<Format, ManualTextLayer[]>>>({});
  const [derivedPartnerZones, setDerivedPartnerZones] = useState<Partial<Record<Format, PartnerZoneConfig | null>>>({});
  const [derivedPartnerLogos, setDerivedPartnerLogos] = useState<Partial<Record<Format, PartnerLogo[]>>>({});


  // Store DOM elements for preview containers so TextOverlay can measure them
  const [previewContainerEls, setPreviewContainerEls] = useState<Record<string, HTMLDivElement | null>>({});

  // FOCUS MODE STATES
  const [focusedFormat, setFocusedFormat] = useState<Format | null>(null);
  const [focusedLayerId, setFocusedLayerId] = useState<string | null>(null);
  const [isFocusEditorOpen, setIsFocusEditorOpen] = useState(false);
  const focusContainerRef = useRef<HTMLDivElement>(null);
  const focusPreviewWrapperRef = useRef<HTMLDivElement>(null);
  const [focusContainerSize, setFocusContainerSize] = useState({ width: 0, height: 0 });
  const [focusedImageDimensions, setFocusedImageDimensions] = useState({ width: 1024, height: 1024 });
  const [isFocusFullscreen, setIsFocusFullscreen] = useState(false);
  const focusFullscreenContainerRef = useRef<HTMLDivElement>(null);


  const bannerImageContainerRef = useRef<HTMLDivElement>(null);
  const landscapeImageContainerRef = useRef<HTMLDivElement>(null);
  const portraitImageContainerRef = useRef<HTMLDivElement>(null);
  const afficheImageContainerRef = useRef<HTMLDivElement>(null);
  const storyImageContainerRef = useRef<HTMLDivElement>(null);
  
  // Refs for hidden export containers
  const exportRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Reset component state when it's closed to ensure it opens fresh every time.
  useEffect(() => {
    if (!isOpen) {
      setFocusedFormat(null);
      setFocusedLayerId(null);
      setSelectedFormats(new Set());
      setIsFocusFullscreen(false);
    }
  }, [isOpen]);
  
  useEffect(() => {
    if (focusedFormat) {
        // Default to open on desktop, closed on mobile
        const isDesktop = window.matchMedia('(min-width: 768px)').matches;
        setIsFocusEditorOpen(isDesktop);
    }
  }, [focusedFormat]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsFocusFullscreen(false);
        }
    };
    if (isFocusFullscreen) {
        document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
        document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFocusFullscreen]);

  // Automatically adapt text layers when main textLayers change or modal opens
  useEffect(() => {
    if (isOpen) {
        const mainFormatDef = DECLINATION_FORMATS.find(f => f.id === mainImageOptions.format);
        // Unused: const mainHeight = mainFormatDef ? getDimensions(mainFormatDef).height : 1024;

        const newDerivedLayers: Partial<Record<Format, ManualTextLayer[]>> = {};
        const newDerivedZones: Partial<Record<Format, PartnerZoneConfig | null>> = {};
        const newDerivedLogos: Partial<Record<Format, PartnerLogo[]>> = {};
        
        DECLINATION_FORMATS.forEach(formatDef => {
            const isMain = formatDef.id === mainImageOptions.format;
            newDerivedLayers[formatDef.id] = isMain ? textLayers : (derivedImages[formatDef.id]?.manualTextLayers || textLayers);
            newDerivedZones[formatDef.id] = isMain ? partnerZone : (derivedImages[formatDef.id]?.partnerZone || partnerZone);
            newDerivedLogos[formatDef.id] = isMain ? partnerLogos : (derivedImages[formatDef.id]?.partnerLogos || partnerLogos);
        });

        setDerivedTextLayers(newDerivedLayers);
        setDerivedPartnerZones(newDerivedZones);
        setDerivedPartnerLogos(newDerivedLogos);
    }
  }, [isOpen, textLayers, partnerZone, partnerLogos, mainImageOptions.format, derivedImages]);

  // New effect for ResizeObserver on focus preview wrapper
  useEffect(() => {
      if (!focusedFormat) return;
      const wrapper = focusPreviewWrapperRef.current;
      if (!wrapper) return;

      const resizeObserver = new ResizeObserver(entries => {
          if (entries[0]) {
              const { width, height } = entries[0].contentRect;
              setFocusContainerSize({ width, height });
          }
      });

      resizeObserver.observe(wrapper);
      return () => resizeObserver.disconnect();
  }, [focusedFormat]);

  // New effect to get natural dimensions of the focused image
  useEffect(() => {
      if (!focusedFormat) return;
      
      const imageB64 = mainImageOptions.format === focusedFormat 
          ? mainImageSrc 
          : derivedImages[focusedFormat]?.imageUrl;
          
      if (!imageB64) {
          // Use format definition as fallback if image not loaded
          const formatDef = DECLINATION_FORMATS.find(f => f.id === focusedFormat);
          if (formatDef) {
              const [w, h] = formatDef.dimensions.replace('px', '').split('x').map(Number);
              setFocusedImageDimensions({ width: w, height: h });
          }
          return;
      }

      const img = new Image();
      img.onload = () => {
          setFocusedImageDimensions({ width: img.naturalWidth || 1024, height: img.naturalHeight || 1024 });
      };
      img.src = `data:image/png;base64,${imageB64}`;

  }, [focusedFormat, mainImageSrc, derivedImages, mainImageOptions.format]);

  const focusResponsiveStyle = useMemo(() => {
      if (!focusedFormat || focusContainerSize.width === 0 || focusContainerSize.height === 0) {
          return { opacity: 0 };
      }

      const containerRatio = focusContainerSize.width / focusContainerSize.height;
      const imageRatio = focusedImageDimensions.width / focusedImageDimensions.height;

      let width: number;
      let height: number;

      if (containerRatio > imageRatio) {
          height = focusContainerSize.height;
          width = height * imageRatio;
      } else {
          width = focusContainerSize.width;
          height = width / imageRatio;
      }

      return {
          width: `${width}px`,
          height: `${height}px`,
      };
  }, [focusedFormat, focusContainerSize, focusedImageDimensions]);


  const handleToggleFormat = (format: Format) => {
    setSelectedFormats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(format)) {
        newSet.delete(format);
      } else {
        newSet.add(format);
      }
      return newSet;
    });
  };

  const handleGenerateClick = () => {
    const adaptationsToGenerate = Array.from(selectedFormats).map((format: Format) => {
      const adaptation: AdaptationRequest = {
        format,
        textConfig: {} as any,
      };
      // Attach crop areas if applicable
      if (format === '3:1 (Bannière)') adaptation.cropArea = bannerCrop;
      if (format === '16:9 (Paysage)') adaptation.cropArea = landscapeCrop;
      if (format === '4:5 (Vertical)') adaptation.cropArea = portraitCrop;
      if (format === 'A3 / A2 (Vertical)') adaptation.cropArea = afficheCrop;
      if (format === '9:16 (Story)') adaptation.cropArea = storyCrop;

      return adaptation;
    });
    onGenerate(adaptationsToGenerate);
    setSelectedFormats(new Set());
  };
  
  const handleRecrop = (formatToRecrop: Format) => {
    setDerivedImages(prev => {
        const newDerived = { ...prev };
        delete newDerived[formatToRecrop];
        return newDerived;
    });
  };

  // Focus Mode Handlers
  const handleEnterFocus = (format: Format) => {
      setFocusedFormat(format);
      setFocusedLayerId(null);
  };

  const handleExitFocus = () => {
      setFocusedFormat(null);
      setFocusedLayerId(null);
  };

  const handleFocusLayerUpdate = (id: string, updates: Partial<ManualTextLayer>) => {
      if (!focusedFormat) return;
      setDerivedTextLayers(prev => ({
          ...prev,
          [focusedFormat]: (prev[focusedFormat] || []).map(l => l.id === id ? { ...l, ...updates } : l)
      }));
  };
  
  const handleFocusPartnerZoneUpdate: React.Dispatch<React.SetStateAction<PartnerZoneConfig | null>> = (value) => {
    if (!focusedFormat) return;
    setDerivedPartnerZones(prev => {
        const currentZone = prev[focusedFormat] || null;
        const newZone = typeof value === 'function' ? value(currentZone) : value;
        return {
            ...prev,
            [focusedFormat]: newZone,
        };
    });
  };

  const handleFocusPartnerLogosUpdate: React.Dispatch<React.SetStateAction<PartnerLogo[]>> = (value) => {
      if (!focusedFormat) return;
      setDerivedPartnerLogos(prev => {
          const currentLogos = prev[focusedFormat] || [];
          const newLogos = typeof value === 'function' ? value(currentLogos) : value;
          return {
              ...prev,
              [focusedFormat]: newLogos,
          };
      });
  };
  
  const handleInitializeFocusLayers = () => {
    if (!focusedFormat) return;

    const initialLayersData: ManualTextLayer[] = [
        { id: 'eventName', text: mainImageOptions.eventName || "Titre principal", x: 50, y: 15, fontSize: 6.5, fontFamily: 'Orbitron', color: '#FFFFFF', isVisible: true, type: 'eventName', effect: 'none' },
        { id: 'baseline', text: mainImageOptions.baseline || "Sous-titre / Slogan", x: 50, y: 25, fontSize: 4, fontFamily: 'Inter', color: '#CCCCCC', isVisible: true, type: 'baseline', effect: 'shadow' },
        { id: 'eventLocation', text: mainImageOptions.eventLocation || "Texte libre 1", x: 50, y: 70, fontSize: 3.5, fontFamily: 'Inter', color: '#FFFFFF', isVisible: true, type: 'eventLocation', effect: 'shadow' },
        { id: 'eventDate', text: mainImageOptions.eventDate || "Texte libre 2", x: 50, y: 75, fontSize: 3.5, fontFamily: 'Inter', color: '#FFFFFF', isVisible: true, type: 'eventDate', effect: 'shadow' }
    ];
    
    const initialLayers = initialLayersData.filter(layer => layer.text && layer.text.trim());

    setDerivedTextLayers(prev => ({
      ...prev,
      [focusedFormat]: initialLayers,
    }));
  };

  const handleFocusSetTextLayers: React.Dispatch<React.SetStateAction<ManualTextLayer[]>> = (value) => {
    if (!focusedFormat) return;
    setDerivedTextLayers(prev => {
      const currentLayers = prev[focusedFormat] || [];
      const newLayers = typeof value === 'function' ? value(currentLayers) : value;
      return {
        ...prev,
        [focusedFormat]: newLayers,
      };
    });
  };

  // Capture DOM for a specific format to include text overlay in export
  const captureFormat = async (formatId: Format): Promise<string | null> => {
      const container = exportRefs.current[formatId];
      if (!container) {
          console.error(`Export container not found for ${formatId}`);
          return null;
      }

      const formatDef = DECLINATION_FORMATS.find(f => f.id === formatId);
      if (!formatDef) return null;
      const { width, height } = getDimensions(formatDef);

      try {
           // Increased wait time to ensure full rendering before capture, especially for heavy assets or fonts
           await new Promise(resolve => setTimeout(resolve, 500));

           const dataUrl = await toPng(container, {
               quality: 1.0,
               pixelRatio: 1,
               width,
               height,
               style: {
                   margin: '0',
                   padding: '0',
                   border: 'none',
                   boxSizing: 'border-box', // Ensure consistent box model during capture
               }
           });
           return dataUrl;
      } catch (e) {
          console.error(`Failed to capture ${formatId}`, e);
          return null;
      }
  };
  
  const handleDownload = async (format: Format) => {
    setDownloadingFormat(format);
    try {
        const formatDef = DECLINATION_FORMATS.find(f => f.id === format);
        if (!formatDef) throw new Error(`Format definition not found for ${format}`);

        const dataUrl = await captureFormat(format);
        if (!dataUrl) throw new Error("Capture failed");

        const link = document.createElement('a');
        link.href = dataUrl;

        const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').slice(0, 50);
        const selectedUniverses = allPresets.filter(p => mainImageOptions.universes.includes(p.id)).map(p => p.label).join(' ');
        const universeSlug = selectedUniverses ? slugify(selectedUniverses) : 'univers-personnalise';
        const formatSlug = slugify(formatDef.label);
        
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
        
        link.download = `${universeSlug}_${formatSlug}_${formatDef.dimensions}_${timestamp}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error(`Failed to download image for format ${format}:`, error);
        alert(`Une erreur est survenue lors du téléchargement pour le format ${format}.`);
    } finally {
        setDownloadingFormat(null);
    }
  };
  
  const handleDownloadZip = async () => {
    if (typeof JSZip === 'undefined') {
        alert("Erreur: La librairie de compression (JSZip) n'a pas pu être chargée.");
        return;
    }
    setIsZipping(true);
    try {
        const zip = new JSZip();
        const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').slice(0, 50);
        const selectedUniverses = allPresets.filter(p => mainImageOptions.universes.includes(p.id)).map(p => p.label).join(' ');
        const universeSlug = selectedUniverses ? slugify(selectedUniverses) : 'univers-personnalise';
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;

        const formatsToDownload = DECLINATION_FORMATS.filter(f => {
             const isMain = mainImageOptions.format === f.id;
             const derived = derivedImages[f.id];
             return isMain || (derived?.imageUrl);
        });

        for (const formatDef of formatsToDownload) {
            const dataUrl = await captureFormat(formatDef.id);
            if (dataUrl) {
                 const response = await fetch(dataUrl);
                 const blob = await response.blob();
                 const formatSlug = slugify(formatDef.label);
                 zip.file(`${universeSlug}_${formatSlug}_${formatDef.dimensions}_${timestamp}.png`, blob);
            }
        }

        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `Pack_Visuels_${universeSlug}_${timestamp}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (error) {
        console.error("Failed to create ZIP file", error);
        alert("Une erreur est survenue lors du création du fichier ZIP.");
    } finally {
        setIsZipping(false);
    }
  };

  // Refactored unified drag handler
  const createDragHandler = (
    axis: 'x' | 'y',
    containerRef: React.RefObject<HTMLDivElement>,
    setCrop: React.Dispatch<React.SetStateAction<CropArea>>,
    initialCrop: CropArea,
    ratio: number
  ) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const dragStartPos = axis === 'y' ? e.clientY : e.clientX;
    const initialCropValue = (axis === 'y' ? initialCrop.y : initialCrop.x) || 0;

    const move = (ev: PointerEvent) => {
        if (!containerRef.current) return;
        
        const containerSize = axis === 'y' ? containerRef.current.offsetHeight : containerRef.current.offsetWidth;
        if (containerSize === 0) return;

        const currentPos = axis === 'y' ? ev.clientY : ev.clientX;
        const delta = currentPos - dragStartPos;
        const deltaPercent = delta / containerSize;
        
        const maxBound = 1 - ratio;
        const newCropValue = Math.max(0, Math.min(maxBound, initialCropValue + deltaPercent));
        
        setCrop({ [axis]: newCropValue });
    };

    const end = (ev: PointerEvent) => {
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture(ev.pointerId);
        } catch(err) {
            // Ignore error if capture was already released
        }
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', end);
    };

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', end);
  };
  

  const renderFormatGridItem = (formatDef: FormatDefinition) => {
    const format = formatDef.id;
    const isMain = mainImageOptions.format === format;
    const derived = derivedImages[format];
    const isGenerated = isMain || (derived && derived.imageUrl);
    const isLoading = (derived && derived.isGenerating) || isGenerating;
    const isSelected = selectedFormats.has(format);
    const isSquareSource = mainImageOptions.format === "1:1 (Carré)";
    
    const showCropper = isSquareSource && !isMain && !isGenerated;
    
    let imageSrcToDisplay = mainImageSrc;
    if (showCropper) {
        imageSrcToDisplay = mainImageSrc;
    } else if (derived?.imageUrl) {
        imageSrcToDisplay = derived.imageUrl;
    }

    const { width: targetWidth, height: targetHeight } = getDimensions(formatDef);
    const targetRatio = targetWidth / targetHeight;

    // CROPPING LOGIC
    let cropper = null;
    let cropperHandler: any = null;
    let cropperTouchAction: React.CSSProperties = {};

    if (showCropper) {
        let style: React.CSSProperties = {};
        
        if (format === '3:1 (Bannière)') {
            style = { top: `${bannerCrop.y! * 100}%`, height: `${(1/3) * 100}%`, left: '0%', width: '100%' };
            cropperHandler = createDragHandler('y', bannerImageContainerRef, setBannerCrop, bannerCrop, 1/3);
            cropperTouchAction = { touchAction: 'pan-x' }; // Vertical drag, allow horizontal scroll
        }
        else if (format === '16:9 (Paysage)') {
            style = { top: `${landscapeCrop.y! * 100}%`, height: `${(9/16) * 100}%`, left: '0%', width: '100%' };
            cropperHandler = createDragHandler('y', landscapeImageContainerRef, setLandscapeCrop, landscapeCrop, 9/16);
            cropperTouchAction = { touchAction: 'pan-x' }; // Vertical drag, allow horizontal scroll
        }
        else if (format === '4:5 (Vertical)') {
            style = { left: `${portraitCrop.x! * 100}%`, width: `${(4/5) * 100}%`, top: '0%', height: '100%' };
            cropperHandler = createDragHandler('x', portraitImageContainerRef, setPortraitCrop, portraitCrop, 4/5);
            cropperTouchAction = { touchAction: 'pan-y' }; // Horizontal drag, allow vertical scroll
        }
         else if (format === 'A3 / A2 (Vertical)') {
            style = { left: `${afficheCrop.x! * 100}%`, width: `${(2/3) * 100}%`, top: '0%', height: '100%' };
            cropperHandler = createDragHandler('x', afficheImageContainerRef, setAfficheCrop, afficheCrop, 2/3);
            cropperTouchAction = { touchAction: 'pan-y' }; // Horizontal drag, allow vertical scroll
        }
        else if (format === '9:16 (Story)') {
            style = { left: `${storyCrop.x! * 100}%`, width: `${(9/16) * 100}%`, top: '0%', height: '100%' };
            cropperHandler = createDragHandler('x', storyImageContainerRef, setStoryCrop, storyCrop, 9/16);
            cropperTouchAction = { touchAction: 'pan-y' }; // Horizontal drag, allow vertical scroll
        }

        if (cropperHandler) {
             cropper = (
                <div className="absolute border-2 border-dashed border-purple-500 bg-purple-500/20 pointer-events-none" style={style}>
                </div>
            );
        }
    }

    const itemRefMap: Record<string, React.RefObject<HTMLDivElement>> = {
      '3:1 (Bannière)': bannerImageContainerRef,
      '16:9 (Paysage)': landscapeImageContainerRef,
      '4:5 (Vertical)': portraitImageContainerRef,
      'A3 / A2 (Vertical)': afficheImageContainerRef,
      '9:16 (Story)': storyImageContainerRef,
    };

    return (
        <div key={format} className={`relative group bg-gray-800/50 rounded-lg p-2 flex flex-col items-center gap-2 border-2 transition-colors ${isSelected ? 'border-purple-500' : 'border-transparent'}`}>
            <h4 className="text-sm font-semibold text-gray-300">{formatDef.label} <span className="text-xs text-gray-500">{formatDef.description} &bull; {formatDef.dimensions}</span></h4>
            <div 
                ref={el => {
                    previewContainerEls[format] = el;
                    if(itemRefMap[format]) (itemRefMap[format] as any).current = el;
                }}
                className={`w-full overflow-hidden rounded-md bg-black/20`}
                style={{ aspectRatio: showCropper ? 1 : targetRatio }}
            >
                {isLoading && format !== mainImageOptions.format && derivedImages[format]?.isGenerating ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <SpinnerIcon className="w-8 h-8 text-purple-400" />
                    </div>
                ) : (
                    <div className="relative w-full h-full">
                         <img src={`data:image/png;base64,${imageSrcToDisplay}`} alt={`Aperçu ${formatDef.label}`} className="absolute inset-0 w-full h-full object-cover"/>
                        
                        {cropper && (
                            <div 
                                className="absolute inset-0 cursor-grab active:cursor-grabbing"
                                onPointerDown={cropperHandler}
                                style={cropperTouchAction}
                            >
                                <div className="absolute inset-0 bg-black/50" />
                                {cropper}
                            </div>
                        )}
                        
                        {isGenerated && (
                            <div className="absolute inset-0 pointer-events-none">
                                <DraggableTextOverlay
                                    layers={derivedTextLayers[format] || []}
                                    selectedLayerId={null}
                                    onLayerSelect={() => {}}
                                    onLayerUpdate={() => {}}
                                    containerRef={{ current: previewContainerEls[format] }}
                                    readOnly={true}
                                    partnerZone={derivedPartnerZones[format] === undefined ? partnerZone : derivedPartnerZones[format]}
                                    partnerLogos={derivedPartnerLogos[format] || []}
                                    onPartnerZoneUpdate={() => {}}
                                    onPartnerLogosUpdate={() => {}}
                                    isExporting={false}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="w-full flex justify-center items-center gap-2 h-9">
                {isGenerated ? (
                     <div className="w-full flex justify-center items-center gap-2">
                        <button onClick={() => handleEnterFocus(format)} className="flex-1 flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 font-semibold py-2 px-3 rounded-md transition text-xs">
                            <PencilIcon className="w-3 h-3" /> Éditer
                        </button>
                        {isSquareSource && !isMain && (
                            <button onClick={() => handleRecrop(format)} className="flex-1 flex items-center justify-center gap-2 bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300 font-semibold py-2 px-3 rounded-md transition text-xs">
                                Recadrer
                            </button>
                        )}
                        <button onClick={() => handleDownload(format)} disabled={downloadingFormat === format} className="flex-1 flex items-center justify-center gap-2 bg-green-600/20 hover:bg-green-600/40 text-green-300 font-semibold py-2 px-3 rounded-md transition text-xs">
                            {downloadingFormat === format ? <SpinnerIcon className="w-4 h-4" /> : <DownloadIcon className="w-4 h-4" />}
                            PNG
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => handleToggleFormat(format)}
                        className={`w-full py-2 px-4 rounded-md transition text-sm font-semibold ${isSelected ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                    >
                        {isLoading ? 'En attente...' : 'Sélectionner'}
                    </button>
                )}
            </div>
        </div>
    );
  };
  
  if (!isOpen) return null;

  return (
    <>
      {focusedFormat ? (() => {
          const formatDef = DECLINATION_FORMATS.find(f => f.id === focusedFormat);
          const imageB64 = mainImageOptions.format === focusedFormat ? mainImageSrc : derivedImages[focusedFormat]?.imageUrl;
          return (
            <div className="fixed inset-0 bg-gray-900 z-30 flex flex-col">
                <header className="flex-shrink-0 p-4 flex justify-between items-center bg-gray-900/80 backdrop-blur-sm z-10 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white font-orbitron">
                        Édition du format : <span className="text-purple-400">{formatDef?.label}</span>
                        {formatDef && <span className="text-gray-400 font-sans font-normal text-lg ml-2"> - {formatDef.description} - {formatDef.dimensions}</span>}
                    </h2>
                    <div>
                        <button onClick={handleExitFocus} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition mr-2">Retour aux déclinaisons</button>
                        <button onClick={() => handleDownload(focusedFormat)} disabled={downloadingFormat === focusedFormat} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition">
                             {downloadingFormat === focusedFormat ? <SpinnerIcon className="w-5 h-5" /> : 'Télécharger'}
                        </button>
                    </div>
                </header>
                <main className="flex-grow flex overflow-hidden relative min-h-0">
                    <div ref={focusPreviewWrapperRef} className="flex-grow flex items-center justify-center bg-black/20 md:rounded-none overflow-hidden min-h-0 p-4">
                        <div ref={focusContainerRef} style={focusResponsiveStyle} className="relative shadow-lg group">
                            {imageB64 ? (
                                <>
                                    <img src={`data:image/png;base64,${imageB64}`} alt={`Visuel ${formatDef?.label}`} className="w-full h-full object-contain" />
                                    <DraggableTextOverlay
                                        layers={derivedTextLayers[focusedFormat] || []}
                                        selectedLayerId={focusedLayerId}
                                        onLayerSelect={setFocusedLayerId}
                                        onLayerUpdate={handleFocusLayerUpdate}
                                        containerRef={focusContainerRef}
                                        partnerZone={derivedPartnerZones[focusedFormat] === undefined ? partnerZone : derivedPartnerZones[focusedFormat]}
                                        partnerLogos={derivedPartnerLogos[focusedFormat] || []}
                                        onPartnerZoneUpdate={handleFocusPartnerZoneUpdate}
                                        onPartnerLogosUpdate={handleFocusPartnerLogosUpdate}
                                    />
                                    <button
                                        onClick={() => setIsFocusFullscreen(true)}
                                        className="absolute top-2 right-2 bg-black/40 text-white rounded-full p-2 hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-20"
                                        title="Plein écran"
                                        aria-label="Afficher en plein écran"
                                    >
                                        <FullScreenIcon className="w-5 h-5" />
                                    </button>
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500">Générez ce format pour l'éditer.</div>
                            )}
                        </div>
                    </div>
                    
                    <div className={`absolute md:relative inset-y-0 right-0 transition-all duration-300 ease-in-out ${isFocusEditorOpen ? 'w-full md:w-[350px]' : 'w-0'} flex-shrink-0 h-full overflow-hidden z-20`}>
                        <div className="w-full md:w-[350px] h-full flex flex-col bg-gray-800 border-l border-gray-700">
                             <ManualTextEditor
                                idPrefix={`focus-${focusedFormat}`}
                                layers={derivedTextLayers[focusedFormat] || []}
                                selectedLayerId={focusedLayerId}
                                onLayerUpdate={handleFocusLayerUpdate}
                                onLayerSelect={setFocusedLayerId}
                                onClose={() => setIsFocusEditorOpen(false)}
                                partnerZone={derivedPartnerZones[focusedFormat] === undefined ? partnerZone : derivedPartnerZones[focusedFormat]}
                                setPartnerZone={handleFocusPartnerZoneUpdate}
                                partnerLogos={derivedPartnerLogos[focusedFormat] || []}
                                setPartnerLogos={handleFocusPartnerLogosUpdate}
                                onInitializeLayers={handleInitializeFocusLayers}
                                setTextLayers={handleFocusSetTextLayers}
                            />
                        </div>
                    </div>

                     <button
                        onClick={() => setIsFocusEditorOpen(!isFocusEditorOpen)}
                        className={`absolute top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-700 text-white p-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all duration-300 ease-in-out z-30 ${
                          isFocusEditorOpen 
                          ? 'left-0 md:left-auto md:right-[350px] rounded-r-lg md:rounded-l-lg md:rounded-r-none' 
                          : 'right-0 rounded-l-lg'
                        }`}
                        aria-label={isFocusEditorOpen ? "Fermer l'éditeur" : "Ouvrir l'éditeur"}
                    >
                        {isFocusEditorOpen ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        )}
                    </button>
                </main>
            </div>
          );
      })() : (
        <div className={`fixed inset-0 bg-gray-900 z-30 flex flex-col transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <header className="flex-shrink-0 p-4 flex justify-between items-center bg-gray-900/80 backdrop-blur-sm z-10 border-b border-gray-800">
            <h2 className="text-xl font-bold text-white font-orbitron">Déclinaison des formats</h2>
            <div>
               <button 
                 onClick={handleDownloadZip}
                 disabled={isZipping || isGenerating}
                 className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition mr-2 disabled:bg-blue-800"
               >
                {isZipping ? <SpinnerIcon className="w-5 h-5" /> : 'Tout télécharger (.zip)'}
               </button>
              <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
            </div>
          </header>
          
          <main className="flex-grow p-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                  {DECLINATION_FORMATS.map(renderFormatGridItem)}
              </div>
          </main>
    
          {selectedFormats.size > 0 && (
            <footer className="flex-shrink-0 p-4 bg-gray-800 border-t border-gray-700 text-center">
                <button
                    onClick={handleGenerateClick}
                    disabled={isGenerating}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition disabled:bg-gray-500"
                >
                    {isGenerating ? (
                        <><SpinnerIcon className="w-5 h-5 inline mr-2"/>Génération...</>
                    ) : (
                        `Générer ${selectedFormats.size} format${selectedFormats.size > 1 ? 's' : ''}`
                    )}
                </button>
            </footer>
          )}
        </div>
      )}

      {isFocusFullscreen && focusedFormat && (() => {
        const formatDef = DECLINATION_FORMATS.find(f => f.id === focusedFormat);
        const imageB64 = mainImageOptions.format === focusedFormat ? mainImageSrc : derivedImages[focusedFormat]?.imageUrl;
        const { width, height } = focusedImageDimensions;

        if (!imageB64) return null;

        return (
            <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-4 animate-fade-in-up">
                <button
                    onClick={() => setIsFocusFullscreen(false)}
                    className="absolute top-4 right-4 bg-black/40 text-white rounded-full p-2 hover:bg-black/60 transition-all z-[102]"
                    title="Quitter le plein écran"
                    aria-label="Quitter le plein écran"
                >
                    <MinimizeIcon className="w-7 h-7" />
                </button>
                <div className="relative w-full h-full flex items-center justify-center">
                    <div 
                        ref={focusFullscreenContainerRef}
                        className="relative max-w-full max-h-full"
                        style={{ aspectRatio: `${width} / ${height}` }}
                    >
                        <img 
                            src={`data:image/png;base64,${imageB64}`} 
                            alt={`Visuel ${formatDef?.label} en plein écran`} 
                            className="block w-full h-full object-contain pointer-events-none"
                        />
                        <DraggableTextOverlay 
                            layers={derivedTextLayers[focusedFormat] || []}
                            selectedLayerId={null}
                            onLayerSelect={() => {}}
                            onLayerUpdate={() => {}}
                            containerRef={focusFullscreenContainerRef}
                            readOnly={true}
                            partnerZone={derivedPartnerZones[focusedFormat] === undefined ? partnerZone : derivedPartnerZones[focusedFormat]}
                            partnerLogos={derivedPartnerLogos[focusedFormat] || []}
                            onPartnerZoneUpdate={() => {}}
                            onPartnerLogosUpdate={() => {}}
                            isExporting={true}
                        />
                    </div>
                </div>
            </div>
        );
    })()}


      {/* Hidden container for full-resolution DOM captures */}
       <div style={{ position: 'fixed', left: '-10000px', top: '-10000px', visibility: 'hidden' }}>
          {DECLINATION_FORMATS.map(formatDef => {
            const isMain = mainImageOptions.format === formatDef.id;
            const derived = derivedImages[formatDef.id];
            const isGenerated = isMain || (derived && derived.imageUrl);
            
            if (!isGenerated) return null;

            const imageB64 = isMain ? mainImageSrc : derived!.imageUrl!;
            const { width, height } = getDimensions(formatDef);
            const exportRef = (el: HTMLDivElement | null) => { exportRefs.current[formatDef.id] = el; };
            
            return (
                <div key={`export-${formatDef.id}`} ref={exportRef} style={{ width, height, position: 'relative', visibility: 'visible', margin: 0, padding: 0 }}>
                    <img src={`data:image/png;base64,${imageB64}`} alt="" style={{ width: '100%', height: '100%', display: 'block' }}/>
                    <DraggableTextOverlay
                        layers={derivedTextLayers[formatDef.id] || []}
                        selectedLayerId={null}
                        onLayerSelect={() => {}}
                        onLayerUpdate={() => {}}
                        containerRef={{ current: exportRefs.current[formatDef.id] }}
                        readOnly={true}
                        referenceHeight={height}
                        partnerZone={derivedPartnerZones[formatDef.id] === undefined ? partnerZone : derivedPartnerZones[formatDef.id]}
                        partnerLogos={derivedPartnerLogos[formatDef.id] || []}
                        onPartnerZoneUpdate={() => {}}
                        onPartnerLogosUpdate={() => {}}
                        isExporting={true}
                    />
                </div>
            );
          })}
       </div>
    </>
  );
};

export default FormatManager;