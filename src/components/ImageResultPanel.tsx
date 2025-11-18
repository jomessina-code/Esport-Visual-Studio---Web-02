import React, { useState, useRef, useEffect, useMemo } from 'react';
import DownloadIcon from './icons/DownloadIcon';
import QualityCheckPanel from './QualityCheckPanel';
import SpinnerIcon from './icons/SpinnerIcon';
import type { EsportPromptOptions, QualityCheckResults, UniversePreset, ManualTextLayer, PartnerZoneConfig, PartnerLogo, CurrentUser } from '../types';
// Removed MicrophoneIcon and useVoiceToText as the old modification modal is gone
// import MicrophoneIcon from './icons/MicrophoneIcon';
// import { useVoiceToText } from '../hooks/useVoiceToText';
import { resizeAndCropImage, detectMargins } from '../utils/image';
import { DECLINATION_FORMATS } from '../constants/formats';
// Removed SendIcon as it was part of the old modification modal
// import SendIcon from './icons/SendIcon';
import UserMenu from './UserMenu';
import DraggableTextOverlay from './TextOverlay/DraggableTextOverlay';
import ManualTextEditor from './TextOverlay/ManualTextEditor';
import PencilIcon from './icons/PencilIcon';
import FullScreenIcon from './icons/FullScreenIcon';
import MinimizeIcon from './icons/MinimizeIcon';
import { toPng } from 'html-to-image';
import OutpaintingIcon from './icons/OutpaintingIcon';

interface ImageResultPanelProps {
  imageSrc: string;
  masterImageNoText: string;
  options: EsportPromptOptions;
  qualityCheckResults: QualityCheckResults | null;
  prompt: string;
  onOutpainting: () => void;
  isOutpainting: boolean;
  onBack: () => void;
  // Removed onTargetedRegeneration as it's replaced by onOpenImageEditor
  // Removed isModificationMode, setIsModificationMode, modificationRequest, setModificationRequest, isModifying
  onDecline: () => void;
  allPresets: UniversePreset[];
  currentUser: CurrentUser | null;
  onLogout: () => void;
  onOpenAuthModal: (mode: 'login' | 'signup') => void;
  onOpenAccountModal: () => void;
  onOpenPricingModal: () => void;
  textLayers: ManualTextLayer[];
  setTextLayers: React.Dispatch<React.SetStateAction<ManualTextLayer[]>>;
  partnerZone: PartnerZoneConfig | null;
  setPartnerZone: React.Dispatch<React.SetStateAction<PartnerZoneConfig | null>>;
  partnerLogos: PartnerLogo[];
  setPartnerLogos: React.Dispatch<React.SetStateAction<PartnerLogo[]>>;
  isLeftPanelOpen: boolean;
  onRequestCloseLeftPanel: () => void;
  isFormatManagerOpen: boolean;
  onGoHome: () => void;
  onOpenImageEditor: () => void; // NEW PROP
}

const EVS_LOGO_URL = "https://i.postimg.cc/nVCRVCHb/logo-EVSV2.png";

const ImageResultPanel: React.FC<ImageResultPanelProps> = ({ 
    imageSrc, 
    masterImageNoText,
    options, 
    qualityCheckResults, 
    prompt,
    onOutpainting,
    isOutpainting,
    onBack,
    // Removed old modification props:
    // onTargetedRegeneration,
    // isModificationMode,
    // setIsModificationMode,
    // modificationRequest,
    // setModificationRequest,
    // isModifying,
    onDecline,
    allPresets,
    currentUser,
    onLogout,
    onOpenAuthModal,
    onOpenAccountModal,
    onOpenPricingModal,
    textLayers,
    setTextLayers,
    partnerZone,
    setPartnerZone,
    partnerLogos,
    setPartnerLogos,
    isLeftPanelOpen,
    onRequestCloseLeftPanel,
    isFormatManagerOpen,
    onGoHome,
    onOpenImageEditor, // NEW PROP
}) => {
  // Removed voice-to-text related states and handlers for modification request
  // const [voiceError, setVoiceError] = useState('');
  // const { isRecording, isCorrecting, toggleRecording } = useVoiceToText({ ... });

  const [showManualEditor, setShowManualEditor] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [showQualityCheckInitial, setShowQualityCheckInitial] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasMargins, setHasMargins] = useState<boolean | null>(null);
  
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null); // Ref for the parent container that provides dimensions
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 }); // State to hold parent dimensions
  
  // Ref for the hidden, full-resolution export container
  const exportContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const [nativeDimensions, setNativeDimensions] = useState({ width: 1024, height: 1024 });
  const [isDownloading, setIsDownloading] = useState(false);

  // Removed handleToggleRecording and handleSubmitModification

  const handleLogoClick = () => {
    onGoHome();
    onRequestCloseLeftPanel();
  };

  useEffect(() => {
    let isMounted = true;
    setHasMargins(null); // Start in "checking" state
    if (masterImageNoText) {
        detectMargins(masterImageNoText).then(result => {
            if (isMounted) {
                setHasMargins(result);
            }
        });
    }
    return () => { isMounted = false; };
  }, [masterImageNoText]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsFullscreen(false);
        }
    };
    if (isFullscreen) {
        document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
        document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);


  // Effect for mutual exclusivity: Close right panel if left panel opens
  useEffect(() => {
      if (isLeftPanelOpen && showManualEditor) {
          setShowManualEditor(false);
      }
  }, [isLeftPanelOpen, showManualEditor]);

  // Effect to handle initial visibility of quality check panel
  useEffect(() => {
      setShowQualityCheckInitial(true);
      const timer = setTimeout(() => {
          setShowQualityCheckInitial(false);
      }, 10000); // Hide after 10 seconds

      return () => clearTimeout(timer);
  }, [qualityCheckResults]);
  
  // New Effect to measure the container size for robustness responsive scaling
  useEffect(() => {
    const wrapper = imageWrapperRef.current;
    if (!wrapper) return;

    // Use ResizeObserver to dynamically get parent dimensions
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(wrapper);
    return () => resizeObserver.disconnect();
  }, []);

  // Effect to determine native dimensions of the master image for accurate export
  useEffect(() => {
      const img = new Image();
      img.onload = () => {
          setNativeDimensions({ width: img.naturalWidth || 1024, height: img.naturalHeight || 1024 });
      };
      img.src = `data:image/png;base64,${masterImageNoText}`;
  }, [masterImageNoText]);

  // Calculate responsive container style using JS for robustness
  const responsiveContainerStyle = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) {
        return { opacity: 0, flexShrink: 0 }; // Hide until measured to prevent flicker, keep flex-shrink
    }

    const containerRatio = containerSize.width / containerSize.height;
    const imageRatio = nativeDimensions.width / nativeDimensions.height;

    let width: number;
    let height: number;

    if (containerRatio > imageRatio) {
        // Container is wider than the image, so height is the limiting factor
        height = containerSize.height;
        width = height * imageRatio;
    } else {
        // Container is taller than (or same ratio as) the image, so width is the limiting factor
        width = containerSize.width;
        height = width / imageRatio;
    }

    return {
        width: `${width}px`,
        height: `${height}px`,
        flexShrink: 0, // Prevent flex container from shrinking this element
    };
  }, [nativeDimensions, containerSize]);


  const initializeTextLayers = () => {
      const initialLayersData: ManualTextLayer[] = [
        {
          id: 'eventName',
          text: options.eventName || "Titre principal",
          x: 50, y: 15, fontSize: 6.5,
          fontFamily: 'Orbitron', color: '#FFFFFF', isVisible: true, type: 'eventName', effect: 'none'
        },
        {
          id: 'baseline',
          text: options.baseline || "Sous-titre / Slogan",
          x: 50, y: 25, fontSize: 4,
          fontFamily: 'Inter', color: '#CCCCCC', isVisible: true, type: 'baseline', effect: 'shadow'
        },
        {
          id: 'eventLocation',
          text: options.eventLocation || "Texte libre 1",
          x: 50, y: 70, fontSize: 3.5,
          fontFamily: 'Inter', color: '#FFFFFF', isVisible: true, type: 'eventLocation', effect: 'shadow'
        },
        {
          id: 'eventDate',
          text: options.eventDate || "Texte libre 2",
          x: 50, y: 75, fontSize: 3.5,
          fontFamily: 'Inter', color: '#FFFFFF', isVisible: true, type: 'eventDate', effect: 'shadow'
        }
      ];

      // If partner zone is visible, adjust the default positions of location and date
      if (partnerZone?.isVisible) {
          const zoneTopEdgeY = partnerZone.y - (partnerZone.height / 2);
          const dateLayer = initialLayersData.find(l => l.id === 'eventDate');
          const locationLayer = initialLayersData.find(l => l.id === 'eventLocation');

          if (dateLayer) {
              // Position date layer's center so its bottom edge is 2% above the zone's top edge
              dateLayer.y = zoneTopEdgeY - 2 - (dateLayer.fontSize / 2);
          }
          if (locationLayer) {
              // Position location layer above the date layer
              const dateLayerTopY = dateLayer ? (dateLayer.y - (dateLayer.fontSize / 2)) : (zoneTopEdgeY - 2);
              locationLayer.y = dateLayerTopY - 1 - (locationLayer.fontSize / 2);
          }
      }
      
      const initialLayers = initialLayersData.filter(layer => layer.text); // Only add layers that have content from options
      
      setTextLayers(initialLayers);
      setShowManualEditor(true);
  };

  const handleLayerUpdate = (id: string, updates: Partial<ManualTextLayer>) => {
    setTextLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };


  const handleDownload = async () => {
    if (!exportContainerRef.current) return;
    setIsDownloading(true);

    const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').slice(0, 50);
    const selectedUniverses = allPresets.filter(p => options.universes.includes(p.id)).map(p => p.label).join(' ');
    const universeSlug = selectedUniverses ? slugify(selectedUniverses) : 'univers-personnalise';
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;

    try {
        // Capture the hidden, full-resolution container directly from DOM.
        // It has exact same structure and dimensions as the native image.
        // IMPORTANT: We explicitly turn off margins/padding for the capture to avoid any bleed.
        const dataUrl = await toPng(exportContainerRef.current, { 
            quality: 1.0,
            pixelRatio: 1, // Important: capture 1:1 pixels of the explicitly sized container
            width: nativeDimensions.width,
            height: nativeDimensions.height,
            style: {
                margin: '0',
                padding: '0',
                border: 'none',
                boxSizing: 'border-box', // Ensure consistent box model during capture
            }
        });
        
        const formatDef = DECLINATION_FORMATS.find(f => f.id === options.format);
        if (!formatDef) throw new Error(`Format definition not found for: ${options.format}`);
        
        // Optional: ensure exact target dimensions if slight rounding errors occurred during capture
        const [targetWidth, targetHeight] = formatDef.dimensions.replace('px', '').split('x').map(Number);
        const finalImageUrl = await resizeAndCropImage(dataUrl, targetWidth, targetHeight);
        
        const link = document.createElement('a');
        link.href = finalImageUrl;
        link.download = `${universeSlug}_${slugify(formatDef.label)}_${formatDef.dimensions}_${timestamp}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("Failed to capture and download image:", error);
        alert("Erreur lors de la capture du visuel.");
    } finally {
        setIsDownloading(false);
    }
  };

  // Removed handleSubmitModification as the modification feature is now handled by ImageEditorPanel

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white relative">
      <header className="flex-shrink-0 p-4 flex justify-between items-center bg-gray-900/80 backdrop-blur-sm z-10 relative border-b border-gray-800">
        <button onClick={handleLogoClick} className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-md -m-1 p-1">
          <img src={EVS_LOGO_URL} alt="Logo" className="h-8" />
          <h1 className="text-xl font-bold font-orbitron">Esport Visual Studio</h1>
        </button>
        <div className="text-right text-sm flex items-center gap-4">
          {currentUser ? (
             <UserMenu
                currentUser={currentUser}
                onLogout={onLogout}
                onOpenAccountModal={onOpenAccountModal}
                onOpenPricingModal={onOpenPricingModal}
             />
          ) : (
            <>
              <button onClick={() => onOpenAuthModal('login')} className="font-bold text-gray-300 hover:text-white transition-colors cursor-pointer hover:underline">Se connecter</button>
              <button onClick={() => onOpenAuthModal('signup')} className="font-bold bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors cursor-pointer">S'inscrire</button>
            </>
          )}
        </div>
      </header>

      <main className="flex-grow flex overflow-hidden relative min-h-0">
        {/* Center Preview Area */}
        <div className="flex flex-col relative overflow-hidden flex-1 min-w-0">
            <div className="flex-grow flex items-center justify-center overflow-hidden bg-black/20 min-h-0 p-4" ref={imageWrapperRef}>
            
            {/* Responsive Preview Container */}
            <div 
                ref={imageContainerRef}
                style={responsiveContainerStyle}
                className="relative shadow-2xl shadow-black/50 group"
            >
                    <img 
                        src={`data:image/png;base64,${masterImageNoText}`} 
                        alt="Visuel généré" 
                        className="block w-full h-full object-contain pointer-events-none"
                        style={{ margin: 0, padding: 0, display: 'block' }}
                    />
                    <DraggableTextOverlay 
                        layers={textLayers}
                        selectedLayerId={selectedLayerId}
                        onLayerSelect={(id) => {
                            setSelectedLayerId(id);
                            if (id) {
                                onRequestCloseLeftPanel();
                                setShowManualEditor(true);
                            }
                        }}
                        onLayerUpdate={handleLayerUpdate}
                        containerRef={imageContainerRef}
                        partnerZone={partnerZone}
                        partnerLogos={partnerLogos}
                        onPartnerZoneUpdate={setPartnerZone}
                        onPartnerLogosUpdate={setPartnerLogos}
                    />
                    {qualityCheckResults && (
                        <div className={`absolute bottom-4 right-4 transition-opacity duration-500 scale-90 origin-bottom-right ${showQualityCheckInitial ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <QualityCheckPanel results={qualityCheckResults} />
                        </div>
                    )}
                    <button
                        onClick={() => setIsFullscreen(true)}
                        className="absolute top-2 right-2 bg-black/40 text-white rounded-full p-2 hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-20"
                        title="Plein écran"
                        aria-label="Afficher en plein écran"
                    >
                        <FullScreenIcon className="w-5 h-5" />
                    </button>
            </div>
            </div>
        </div>

        {/* Right Sidebar - Retractable */}
        <div className={`absolute md:relative inset-y-0 right-0 md:inset-auto transition-all duration-300 ease-in-out ${showManualEditor ? 'w-full md:w-80' : 'w-0'} flex-shrink-0 h-full overflow-hidden z-20`}>
             {/* Fixed width inner container prevents content from squishing during transition */}
             <div className="w-full md:w-80 h-full relative flex flex-col">
                <ManualTextEditor 
                    idPrefix="main-panel-editor"
                    layers={textLayers}
                    selectedLayerId={selectedLayerId}
                    onLayerUpdate={handleLayerUpdate}
                    onLayerSelect={setSelectedLayerId}
                    onClose={() => setShowManualEditor(false)}
                    partnerZone={partnerZone}
                    setPartnerZone={setPartnerZone}
                    partnerLogos={partnerLogos}
                    setPartnerLogos={setPartnerLogos}
                    onInitializeLayers={initializeTextLayers}
                    setTextLayers={setTextLayers}
                />
            </div>
        </div>
      </main>

      {/* UNIFIED TOGGLE BUTTON - MOVED OUTSIDE MAIN to avoid clipping issues. Positioned relative to the whole panel. */}
        {!isFormatManagerOpen && (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (!showManualEditor) {
                        // Opening
                        onRequestCloseLeftPanel();
                        setShowManualEditor(true);
                        // If opening and layers exist but none are selected, select the first one.
                        if (textLayers.length > 0 && !selectedLayerId) {
                            setSelectedLayerId(textLayers[0].id);
                        }
                    } else {
                        // Closing
                        setShowManualEditor(false);
                    }
                }}
                className={`absolute top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-700 text-white p-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all duration-300 ease-in-out z-50 ${
                  showManualEditor 
                  ? 'left-0 md:left-auto md:right-80 rounded-r-lg md:rounded-l-lg md:rounded-r-none' 
                  : 'right-0 rounded-l-lg'
                }`}
                aria-label={showManualEditor ? "Fermer l'éditeur de texte" : "Ouvrir l'éditeur de texte"}
                title={showManualEditor ? "Fermer l'éditeur (Texte)" : "Ouvrir l'éditeur (Texte)"}
            >
                {showManualEditor ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /> {/* Chevron Right (to close) */}
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /> {/* Chevron Left (to open) */}
                    </svg>
                )}
            </button>
        )}

      {/* Hidden container for full-resolution DOM capture.
          It explicitly uses native dimensions to ensure 1:1 export regardless of screen size.
          Forced zero margins/padding to prevent edge bleeding.
      */}
      <div style={{ position: 'fixed', left: '-10000px', top: '-10000px', visibility: 'hidden' }}>
         <div 
            style={{ 
                width: nativeDimensions.width, 
                height: nativeDimensions.height, 
                position: 'relative',
                visibility: 'visible',
                margin: 0,
                padding: 0,
                overflow: 'hidden',
                border: 'none',
            }}
            ref={exportContainerRef}
        >
             <img 
                src={`data:image/png;base64,${masterImageNoText}`} 
                alt="Master for export"
                style={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'block', 
                    objectFit: 'cover', 
                    margin: 0, 
                    padding: 0,
                    border: 'none'
                }}
            />
            <DraggableTextOverlay 
                layers={textLayers}
                selectedLayerId={null}
                onLayerSelect={() => {}}
                onLayerUpdate={() => {}}
                containerRef={exportContainerRef}
                readOnly={true}
                referenceHeight={nativeDimensions.height} // Force native height for export
                partnerZone={partnerZone}
                partnerLogos={partnerLogos}
                onPartnerZoneUpdate={() => {}}
                onPartnerLogosUpdate={() => {}}
                isExporting={true}
            />
         </div>
      </div>

      <footer className="flex-shrink-0 p-4 bg-gray-800 border-t border-gray-700 grid grid-cols-4 gap-3 z-10">
        <button onClick={handleDownload} disabled={isDownloading} className="col-span-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition">
          {isDownloading ? <SpinnerIcon className="w-5 h-5" /> : <DownloadIcon className="w-5 h-5" />} 
          {isDownloading ? 'Capture...' : 'Télécharger'}
        </button>
        <button onClick={onDecline} className="col-span-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition">Formats</button>
        <button
            onClick={onOutpainting}
            disabled={!hasMargins || isOutpainting}
            className="col-span-1 flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition"
            title={hasMargins === false ? "Aucune marge détectée sur l'image" : "Étendre le fond pour remplir les marges"}
        >
            {isOutpainting ? <SpinnerIcon className="w-5 h-5" /> : <OutpaintingIcon className="w-5 h-5" />}
            Outpainting
        </button>
        <button onClick={onOpenImageEditor} className="col-span-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition">Modifier</button> {/* MODIFIED BUTTON */}
      </footer>
      {/* REMOVED OLD MODIFICATION MODE UI */}

    {isFullscreen && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-4 animate-fade-in-up">
            <button
                onClick={() => setIsFullscreen(false)}
                className="absolute top-4 right-4 bg-black/40 text-white rounded-full p-2 hover:bg-black/60 transition-all z-[102]"
                title="Quitter le plein écran"
                aria-label="Quitter le plein écran"
            >
                <MinimizeIcon className="w-7 h-7" />
            </button>
            <div className="relative w-full h-full flex items-center justify-center">
                <div 
                    ref={fullscreenContainerRef}
                    className="relative max-w-full max-h-full"
                    style={{
                        aspectRatio: `${nativeDimensions.width} / ${nativeDimensions.height}`,
                    }}
                >
                    <img 
                        src={`data:image/png;base64,${masterImageNoText}`} 
                        alt="Visuel généré en plein écran" 
                        className="block w-full h-full object-contain pointer-events-none"
                    />
                    <DraggableTextOverlay 
                        layers={textLayers}
                        selectedLayerId={null}
                        onLayerSelect={() => {}}
                        onLayerUpdate={() => {}}
                        containerRef={fullscreenContainerRef}
                        readOnly={true}
                        partnerZone={partnerZone}
                        partnerLogos={partnerLogos}
                        onPartnerZoneUpdate={() => {}}
                        onPartnerLogosUpdate={() => {}}
                        isExporting={true}
                    />
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ImageResultPanel;