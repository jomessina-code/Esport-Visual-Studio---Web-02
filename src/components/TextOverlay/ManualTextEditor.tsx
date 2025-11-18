import React, { useState, useRef, useEffect } from 'react';
import type { ManualTextLayer, PartnerZoneConfig, PartnerLogo } from '../../types';
import EyeIcon from '../icons/EyeIcon';
import EyeSlashIcon from '../icons/EyeSlashIcon';
import CenterIcon from '../icons/CenterIcon';
import TypeIcon from '../icons/TypeIcon';
import HandshakeIcon from '../icons/HandshakeIcon';
import UploadIcon from '../icons/UploadIcon';
import TrashIcon from '../icons/TrashIcon';
import SwitchContainerIcon from '../icons/SwitchContainerIcon';

// --- Composant et fonctions pour le sélecteur de couleur hexagonal ---

const Hexagon: React.FC<{ color: string; onClick: () => void; isSelected?: boolean }> = ({ color, onClick, isSelected = false }) => (
  <div 
    className="relative w-[12px] h-[14px] cursor-pointer transition-transform duration-150 hover:scale-125"
    onClick={onClick}
    role="button"
    aria-label={`Select color ${color}`}
    style={{ backfaceVisibility: 'hidden' }}
  >
    <div 
      className="absolute inset-0 bg-gray-600"
      style={{
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
      }}
    />
    <div 
      className={`absolute inset-[1px] transition-all duration-200 ${isSelected ? 'transform scale-110 z-10' : ''}`}
      style={{
        backgroundColor: color,
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
      }}
    />
    {isSelected && <div 
        className="absolute inset-0 ring-1 ring-offset-1 ring-offset-gray-800 ring-purple-400"
        style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
    />}
  </div>
);

const generateHexagonalPalette = () => {
    const palette: string[][] = [];
    const radius = 6;
    for (let q = -radius; q <= radius; q++) {
        const row: string[] = [];
        const r1 = Math.max(-radius, -q - radius);
        const r2 = Math.min(radius, -q + radius);
        for (let r = r1; r <= r2; r++) {
            const col = q + radius;
            const rowIdx = r + q / 2 + radius;
            const hue = (180 + (col / (2 * radius)) * 360) % 360;
            const lightness = 90 - (rowIdx / (2 * radius)) * 80;
            const lightnessNorm = (lightness - 10) / 80;
            const saturation = 100 - Math.pow(Math.abs(lightnessNorm - 0.5) * 2, 1.5) * 80;
            row.push(`hsl(${hue.toFixed(0)}, ${saturation.toFixed(0)}%, ${lightness.toFixed(0)}%)`);
        }
        palette.push(row);
    }
    const grayscaleRow: string[] = [];
    const grayscaleWidth = radius * 2 + 1;
    for (let i = 0; i < grayscaleWidth; i++) {
        const lightness = 100 - (i / (grayscaleWidth - 1)) * 100;
        grayscaleRow.push(`hsl(0, 0%, ${lightness.toFixed(0)}%)`);
    }
    palette.push([]);
    palette.push(grayscaleRow);
    return palette;
};

const PALETTE = generateHexagonalPalette();

const HexColorPickerPopup: React.FC<{
  onClose: () => void;
  onSetColor: (color: string) => void;
  currentColor: string;
  title: string;
}> = ({ onClose, onSetColor, currentColor, title }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleHexClick = (color: string) => {
    onSetColor(color);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-sm p-6 border border-gray-700 text-white animate-fade-in-up">
        <h3 className="text-xl font-bold font-orbitron text-purple-300 mb-4 text-center">{title}</h3>
        
        <div className="flex flex-col items-center gap-0 mb-6" role="list">
          {PALETTE.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center" style={{ marginTop: row.length > 0 ? '-4px' : '0px' }}>
              {row.map((color, colIndex) => (
                <div key={colIndex} className="p-[1px]" role="listitem">
                   <Hexagon 
                     color={color} 
                     onClick={() => handleHexClick(color)}
                     isSelected={currentColor.toLowerCase() === color.toLowerCase()}
                   />
                </div>
              ))}
            </div>
          ))}
        </div>
        
        <div className="flex justify-end gap-4">
          <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

const HexagonColorInput: React.FC<{ color: string; onClick: () => void }> = ({ color, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="w-5 h-6 bg-gray-900/50 rounded-md border border-dashed border-gray-600 hover:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-center p-0 transition-colors"
    >
        <div className="relative w-full h-full">
            <div 
                className="absolute inset-0"
                style={{ 
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, #4a5568 25%, transparent 25%), linear-gradient(-45deg, #4a5568 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #4a5568 75%), linear-gradient(-45deg, transparent 75%, #4a5568 75%)' : 'none',
                    backgroundSize: '6px 6px',
                    backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px'
                }}
            />
            <div 
                className="absolute inset-[1px]" 
                style={{ 
                    backgroundColor: color,
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
                }}
            />
        </div>
    </button>
);


interface ManualTextEditorProps {
  layers: ManualTextLayer[];
  selectedLayerId: string | null;
  onLayerUpdate: (id: string, updates: Partial<ManualTextLayer>) => void;
  onLayerSelect: (id: string | null) => void;
  onClose: () => void;
  partnerZone: PartnerZoneConfig | null;
  setPartnerZone: React.Dispatch<React.SetStateAction<PartnerZoneConfig | null>>;
  partnerLogos: PartnerLogo[];
  setPartnerLogos: React.Dispatch<React.SetStateAction<PartnerLogo[]>>;
  onInitializeLayers: () => void;
  setTextLayers: React.Dispatch<React.SetStateAction<ManualTextLayer[]>>;
  idPrefix?: string;
}

const FONTS = ['Orbitron', 'Inter', 'Oswald', 'Teko', 'Audiowide', 'Permanent Marker'];
const EFFECTS: { value: ManualTextLayer['effect']; label: string }[] = [
    { value: 'none', label: 'Aucun' },
    { value: 'shadow', label: 'Ombre' },
    { value: 'outline', label: 'Contour' },
    { value: 'neon', label: 'Néon' },
];

const ManualTextEditor: React.FC<ManualTextEditorProps> = ({
  layers,
  selectedLayerId,
  onLayerUpdate,
  onLayerSelect,
  onClose,
  partnerZone,
  setPartnerZone,
  partnerLogos,
  setPartnerLogos,
  onInitializeLayers,
  setTextLayers,
  idPrefix = 'editor',
}) => {
  const selectedLayer = layers.find(l => l.id === selectedLayerId);
  const areLayersInitialized = layers.length > 0;
  const areLayersVisible = areLayersInitialized && layers.some(l => l.isVisible);
  const [colorPickerTarget, setColorPickerTarget] = useState<'backgroundColor' | 'borderColor' | 'shadowColor' | null>(null);
  const [isTextColorPickerOpen, setIsTextColorPickerOpen] = useState(false);

  const handleMasterToggle = () => {
    if (!areLayersInitialized) {
      onInitializeLayers();
    } else {
      const shouldBeVisible = !areLayersVisible;
      setTextLayers(prevLayers =>
        prevLayers.map(l => ({ ...l, isVisible: shouldBeVisible }))
      );
      if (!shouldBeVisible) {
        onLayerSelect(null);
      }
    }
  };

  const getLayerLabel = (layer: ManualTextLayer, allLayers: ManualTextLayer[]) => {
    switch(layer.type) {
        case 'eventName': return "Titre principal";
        case 'baseline': return "Sous-titre / Slogan";
        case 'eventLocation': return "Texte libre 1";
        case 'eventDate': return "Texte libre 2";
        case 'custom': {
            const customLayers = allLayers.filter(l => l.type === 'custom');
            const index = customLayers.findIndex(l => l.id === layer.id);
            // Start numbering from 3
            return `Texte ${index + 3}`;
        }
        default: return layer.type;
    }
  };

  const handleAddLayer = () => {
    const customLayersCount = layers.filter(l => l.type === 'custom').length;
    const newLayerNumber = customLayersCount + 3;
    const newLayer: ManualTextLayer = {
      id: `custom_${Date.now()}`,
      text: `Texte ${newLayerNumber}`,
      x: 50,
      y: 50,
      fontSize: 4,
      fontFamily: 'Inter',
      color: '#FFFFFF',
      isVisible: true,
      type: 'custom',
      effect: 'shadow'
    };
    setTextLayers(prev => [...prev, newLayer]);
    onLayerSelect(newLayer.id);
  };

  const handleDeleteLayer = (idToDelete: string) => {
    setTextLayers(prev => prev.filter(l => l.id !== idToDelete));
    if (selectedLayerId === idToDelete) {
      onLayerSelect(null);
    }
  };

  const handleZoneToggle = () => {
    setPartnerZone(prev => {
        if (prev) {
            return { ...prev, isVisible: !prev.isVisible };
        }
        // New default values based on user's image
        return {
            x: 50, y: 85, width: 80, height: 15, opacity: 0.4, isVisible: true,
            backgroundColor: '#FFFFFF',
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#FFFFFF',
            shadowBlur: 7,
            shadowColor: '#4A4A4A',
            shadowSpread: 2,
        };
    });
  };

  const handleZoneChange = (updates: Partial<PartnerZoneConfig>) => {
    setPartnerZone(prev => prev ? { ...prev, ...updates } : null);
  };
  
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        Array.from(e.target.files).forEach((file: File) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const src = event.target?.result as string;
                const img = new Image();
                img.onload = () => {
                     const newLogo: PartnerLogo = {
                        id: `logo_${Date.now()}_${Math.random()}`,
                        src,
                        name: file.name,
                        x: Math.random() * 70 + 5,
                        y: Math.random() * 50,
                        width: 15,
                        height: 15 / (img.naturalWidth / img.naturalHeight),
                        aspectRatio: img.naturalWidth / img.naturalHeight,
                        isVisible: true,
                        container: 'zone',
                    };
                    setPartnerLogos(prev => [...prev, newLogo]);
                };
                img.src = src;
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    }
  };

  const updateLogo = (id: string, updates: Partial<PartnerLogo>) => {
      const logo = partnerLogos.find(l => l.id === id);
      if (logo && updates.container && (logo.container ?? 'zone') !== updates.container) {
          // Position is reset when container changes for predictability
          updates.x = 50;
          updates.y = 50;
          updates.width = 15; // Reset to a sensible default width
      }
      setPartnerLogos(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };
  
  const deleteLogo = (id: string) => {
      setPartnerLogos(prev => prev.filter(logo => logo.id !== id));
  };

  return (
    <div className="bg-gray-800 border-l border-gray-700 w-full flex flex-col h-full">
       <header className="flex-shrink-0 p-4 flex justify-between items-center border-b border-gray-700 bg-gray-800/50">
            <h3 className="text-lg font-bold text-purple-300 font-orbitron flex items-center gap-2">
                <TypeIcon className="w-5 h-5" />
                Éditeur de texte & Logos
            </h3>
       </header>
      
      <div className="flex-grow p-4 space-y-6 overflow-y-auto custom-scrollbar min-h-0">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="text-sm text-gray-400 uppercase font-semibold flex items-center gap-2">
                    <TypeIcon className="w-4 h-4"/> Zone Textes
                </h4>
                <label htmlFor={`${idPrefix}-master-text-toggle`} className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={areLayersVisible} 
                        onChange={handleMasterToggle} 
                        className="sr-only peer" 
                        id={`${idPrefix}-master-text-toggle`}
                    />
                    <div className="w-9 h-5 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
            </div>

            {areLayersVisible && (
              <div className="space-y-2 animate-fade-in-up" style={{animationDuration: '300ms'}}>
                {layers.map(layer => (
                  <div 
                    key={layer.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedLayerId === layer.id ? 'bg-purple-600 text-white' : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                    }`}
                    onClick={() => onLayerSelect(selectedLayerId === layer.id ? null : layer.id)}
                  >
                    <span className="font-semibold truncate pr-2">{getLayerLabel(layer, layers)}</span>
                     <div className="flex items-center gap-1 flex-shrink-0">
                         <button
                            onClick={(e) => { e.stopPropagation(); onLayerUpdate(layer.id, { isVisible: !layer.isVisible }); }}
                            className={`p-1 rounded hover:bg-black/20 ${layer.isVisible ? 'text-current' : 'text-gray-500'}`}
                        >
                            {layer.isVisible ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
                        </button>
                        {layer.type === 'custom' && (
                             <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteLayer(layer.id); }}
                                className="p-1 rounded text-gray-400 hover:bg-red-600 hover:text-white"
                                title="Supprimer ce calque"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                     </div>
                  </div>
                ))}
                 <button
                    onClick={handleAddLayer}
                    className="w-full mt-2 p-2 bg-purple-600/20 text-purple-300 rounded-lg hover:bg-purple-600/40 transition text-sm"
                >
                    + Ajouter un texte
                </button>
              </div>
            )}
          </div>

          {selectedLayer && areLayersVisible && (
            <div className="space-y-4 border-t border-gray-700 pt-4 animate-fade-in-up">
                <div className="flex justify-between items-center">
                     <label className="block text-xs text-gray-400">Position</label>
                     <button 
                        onClick={() => onLayerUpdate(selectedLayer.id, { x: 50 })}
                        className="text-xs flex items-center gap-1 bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-300 transition-colors"
                        title="Centrer horizontalement"
                     >
                        <CenterIcon className="w-3 h-3" /> Centrer
                     </button>
                </div>
                
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Contenu</label>
                    <input 
                        type="text"
                        value={selectedLayer.text}
                        onChange={(e) => onLayerUpdate(selectedLayer.id, { text: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-purple-500"
                    />
                </div>
                
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Police</label>
                     <div className="grid grid-cols-2 gap-2">
                        {FONTS.map(font => (
                            <button
                                key={font}
                                onClick={() => onLayerUpdate(selectedLayer.id, { fontFamily: font })}
                                className={`px-2 py-1.5 text-xs truncate rounded border ${
                                    selectedLayer.fontFamily === font 
                                        ? 'bg-purple-600 border-purple-500 text-white' 
                                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                                }`}
                                style={{ fontFamily: font }}
                                title={font}
                            >
                                {font}
                            </button>
                        ))}
                     </div>
                </div>

                <div>
                    <label className="block text-xs text-gray-400 mb-1">Taille: {selectedLayer.fontSize}</label>
                    <input 
                        type="range" 
                        min="1" 
                        max="25" 
                        step="0.5"
                        value={selectedLayer.fontSize}
                        onChange={(e) => onLayerUpdate(selectedLayer.id, { fontSize: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                </div>

                <div className="flex justify-between items-center">
                    <label className="block text-xs text-gray-400">Couleur</label>
                    <HexagonColorInput color={selectedLayer.color} onClick={() => setIsTextColorPickerOpen(true)} />
                </div>

                <div>
                    <label className="block text-xs text-gray-400 mb-2">Effet</label>
                    <div className="grid grid-cols-2 gap-2">
                        {EFFECTS.map(effect => (
                            <button
                                key={effect.value || 'none'}
                                onClick={() => onLayerUpdate(selectedLayer.id, { effect: effect.value })}
                                className={`px-2 py-1.5 text-xs rounded border ${
                                    (selectedLayer.effect || 'none') === effect.value
                                        ? 'bg-purple-600 border-purple-500 text-white'
                                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                {effect.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
          )}

            <div className="space-y-4 border-t border-gray-700 pt-4">
                <div className="flex justify-between items-center">
                    <h4 className="text-sm text-gray-400 uppercase font-semibold flex items-center gap-2">
                        <HandshakeIcon className="w-4 h-4"/> Zone Logos
                    </h4>
                    <label htmlFor={`${idPrefix}-zone-toggle`} className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={partnerZone?.isVisible || false} onChange={handleZoneToggle} className="sr-only peer" id={`${idPrefix}-zone-toggle`}/>
                        <div className="w-9 h-5 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>
                {partnerZone && partnerZone.isVisible && (
                    <div className="space-y-4 animate-fade-in-up" style={{animationDuration: '300ms'}}>
                        
                        <div className="p-3 rounded-lg border border-gray-700 space-y-3">
                            <h5 className="text-sm font-semibold text-gray-300">Fond</h5>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Opacité du fond : {Math.round(partnerZone.opacity * 100)}%</label>
                                <input type="range" min="0" max="100" value={partnerZone.opacity * 100} onChange={(e) => handleZoneChange({ opacity: parseFloat(e.target.value) / 100 })} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Arrondi des bords : {partnerZone.borderRadius ?? 10}%</label>
                                <input type="range" min="0" max="50" value={partnerZone.borderRadius ?? 10} onChange={(e) => handleZoneChange({ borderRadius: parseInt(e.target.value, 10) })} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <label className="block text-xs text-gray-400">Couleur du fond</label>
                                <HexagonColorInput color={partnerZone.backgroundColor} onClick={() => setColorPickerTarget('backgroundColor')} />
                            </div>
                        </div>

                        <div className="p-3 rounded-lg border border-gray-700 space-y-3">
                            <h5 className="text-sm font-semibold text-gray-300">Contour</h5>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Épaisseur du contour : {partnerZone.borderWidth ?? 0}px</label>
                                <input type="range" min="0" max="10" value={partnerZone.borderWidth ?? 0} onChange={(e) => handleZoneChange({ borderWidth: parseInt(e.target.value, 10) })} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <label className="block text-xs text-gray-400">Couleur du contour</label>
                                <HexagonColorInput color={partnerZone.borderColor || 'transparent'} onClick={() => setColorPickerTarget('borderColor')} />
                            </div>
                        </div>

                        <div className="p-3 rounded-lg border border-gray-700 space-y-3">
                            <h5 className="text-sm font-semibold text-gray-300">Lueur (Effet d'ombre)</h5>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Flou (lueur) : {partnerZone.shadowBlur ?? 0}px</label>
                                <input type="range" min="0" max="50" value={partnerZone.shadowBlur ?? 0} onChange={(e) => handleZoneChange({ shadowBlur: parseInt(e.target.value, 10) })} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Étendue (lueur) : {partnerZone.shadowSpread ?? 0}px</label>
                                <input type="range" min="0" max="25" value={partnerZone.shadowSpread ?? 0} onChange={(e) => handleZoneChange({ shadowSpread: parseInt(e.target.value, 10) })} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                            </div>
                             <div className="flex justify-between items-center pt-2">
                                <label className="block text-xs text-gray-400">Couleur de la lueur</label>
                                <HexagonColorInput color={partnerZone.shadowColor || 'transparent'} onClick={() => setColorPickerTarget('shadowColor')} />
                            </div>
                        </div>

                        <div className="border-t border-gray-700 pt-4 space-y-2">
                            <label htmlFor="logo-upload" className="w-full flex items-center justify-center gap-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 font-semibold py-2 px-3 rounded-lg transition cursor-pointer">
                                <UploadIcon className="w-4 h-4" />
                                Ajouter un logo
                            </label>
                            <input id="logo-upload" type="file" multiple accept="image/png, image/jpeg, image/svg+xml" className="hidden" onChange={handleLogoUpload} />
                            
                            <div className="space-y-2">
                                {partnerLogos.map(logo => (
                                    <div key={logo.id} className="flex items-center gap-2 bg-gray-700/50 p-2 rounded-lg">
                                        <img src={logo.src} alt={logo.name} className="w-8 h-8 object-contain bg-black/20 rounded"/>
                                        <p className="flex-grow text-xs text-gray-300 truncate">{logo.name}</p>
                                        <button onClick={() => updateLogo(logo.id, { container: (logo.container ?? 'zone') === 'zone' ? 'canvas' : 'zone' })} className="p-1 rounded text-gray-400 hover:bg-purple-600 hover:text-white" title={(logo.container ?? 'zone') === 'zone' ? 'Déplacer sur le visuel' : 'Remettre dans la zone'}>
                                            <SwitchContainerIcon className="w-4 h-4" direction={(logo.container ?? 'zone') === 'zone' ? 'out' : 'in'}/>
                                        </button>
                                        <button onClick={() => updateLogo(logo.id, { isVisible: !logo.isVisible })} className={`p-1 rounded hover:bg-black/20 ${logo.isVisible ? 'text-gray-300' : 'text-gray-500'}`} title={logo.isVisible ? "Cacher" : "Afficher"}>
                                            {logo.isVisible ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => deleteLogo(logo.id)} className="p-1 rounded text-gray-400 hover:bg-red-600 hover:text-white" title="Supprimer">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
      </div>
      {colorPickerTarget && partnerZone && (
          <HexColorPickerPopup
              onClose={() => setColorPickerTarget(null)}
              onSetColor={(color) => handleZoneChange({ [colorPickerTarget]: color })}
              currentColor={partnerZone[colorPickerTarget] || '#FFFFFF'}
              title={`Couleur ${
                  colorPickerTarget === 'backgroundColor' ? 'du fond' :
                  colorPickerTarget === 'borderColor' ? 'du contour' :
                  'de la lueur'
              }`}
          />
      )}
      {isTextColorPickerOpen && selectedLayer && (
        <HexColorPickerPopup
            onClose={() => setIsTextColorPickerOpen(false)}
            onSetColor={(color) => onLayerUpdate(selectedLayer.id, { color })}
            currentColor={selectedLayer.color}
            title="Couleur du texte"
        />
      )}
    </div>
  );
};

export default ManualTextEditor;