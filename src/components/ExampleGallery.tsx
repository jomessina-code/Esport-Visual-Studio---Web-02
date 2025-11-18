
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GALLERY_IMAGES } from '../constants/gallery';
import ImagePlaceholderIcon from './icons/ImagePlaceholderIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import type { CurrentUser } from '../types';

interface GalleryItemProps {
  src: string;
  alt: string;
  onClick: () => void;
}

const GalleryItem: React.FC<GalleryItemProps> = React.memo(({ src, alt, onClick }) => {
    const [hasError, setHasError] = useState(false);

    return (
        <div className="flex-shrink-0 w-full px-2">
            <button
                onClick={onClick}
                className="group relative block w-full pb-[100%] bg-gray-800 rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500"
            >
                <div className="absolute inset-0 w-full h-full">
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                         {/* Removed 'Agrandir' text */}
                    </div>
                    <div className="absolute inset-0 p-0">
                        {hasError ? (
                            <div className="w-full h-full flex flex-col items-center justify-center p-2">
                                <ImagePlaceholderIcon className="w-12 h-12 text-gray-600" />
                                <p className="text-xs text-gray-500 mt-2 text-center">Image non disponible</p>
                            </div>
                        ) : (
                            <img
                                src={src}
                                alt={alt}
                                loading="lazy"
                                className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105 group-hover:brightness-110"
                                onError={() => setHasError(true)}
                            />
                        )}
                    </div>
                </div>
            </button>
        </div>
    );
});


interface ExampleGalleryProps {
  onImageClick: () => void;
  currentUser: CurrentUser | null;
  onLoginRequest: () => void;
}

const ExampleGallery: React.FC<ExampleGalleryProps> = ({ onImageClick, currentUser, onLoginRequest }) => {
    const [itemsPerPage, setItemsPerPage] = useState(3);
    const [currentIndex, setCurrentIndex] = useState(0); // Start at 0 for simpler logic
    const [isTransitioning, setIsTransitioning] = useState(true);
    const [isHovering, setIsHovering] = useState(false);
    const [selectedImage, setSelectedImage] = useState<{url: string, alt: string} | null>(null);
    
    const autoplayRef = useRef<number | null>(null);

    // Create a memoized array of images with clones at the start and end for infinite loop effect
    const imagesWithClones = React.useMemo(() => {
        if (GALLERY_IMAGES.length === 0) return [];
        const startClones = GALLERY_IMAGES.slice(-itemsPerPage);
        const endClones = GALLERY_IMAGES.slice(0, itemsPerPage);
        return [...startClones, ...GALLERY_IMAGES, ...endClones];
    }, [itemsPerPage]);
    
    // Effect for responsive slide count
    useEffect(() => {
        const calculateItemsPerPage = () => {
            if (window.innerWidth < 640) return 1;
            if (window.innerWidth < 1024) return 2;
            return 3;
        };
        const handleResize = () => {
            const newItemsPerPage = calculateItemsPerPage();
            setItemsPerPage(newItemsPerPage);
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial calculation
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Set initial position after itemsPerPage is determined
    useEffect(() => {
        setCurrentIndex(itemsPerPage);
    }, [itemsPerPage]);

    const advanceSlide = useCallback((direction: 'next' | 'prev') => {
        setIsTransitioning(true);
        setCurrentIndex(prev => prev + (direction === 'next' ? 1 : -1));
    }, []);

    // Autoplay logic
    useEffect(() => {
        // Stop autoplay if hovering, not enough images, or POPUP IS OPEN (selectedImage is not null)
        if (isHovering || imagesWithClones.length <= itemsPerPage || selectedImage) {
            if (autoplayRef.current) clearInterval(autoplayRef.current);
            return;
        }
        
        autoplayRef.current = window.setInterval(() => advanceSlide('next'), 3000); // 3-second interval

        return () => {
            if (autoplayRef.current) clearInterval(autoplayRef.current);
        };
    }, [isHovering, advanceSlide, imagesWithClones.length, itemsPerPage, selectedImage]);

    const handleTransitionEnd = useCallback(() => {
        if (currentIndex >= GALLERY_IMAGES.length + itemsPerPage) {
            setIsTransitioning(false);
            setCurrentIndex(itemsPerPage);
        }
        if (currentIndex < itemsPerPage) {
            setIsTransitioning(false);
            setCurrentIndex(GALLERY_IMAGES.length + itemsPerPage - 1);
        }
    }, [currentIndex, itemsPerPage, GALLERY_IMAGES.length]);

    // Use an effect to re-enable transition after a jump
    useEffect(() => {
        if (!isTransitioning) {
            const timer = setTimeout(() => setIsTransitioning(true), 50); // Small delay to allow render
            return () => clearTimeout(timer);
        }
    }, [isTransitioning]);
    
    const handlePrev = () => {
        advanceSlide('prev');
    };

    const handleNext = () => {
        advanceSlide('next');
    };

    const handleImageClickInternal = (url: string, alt: string) => {
        setSelectedImage({ url, alt });
    };

    const closePopup = () => {
        setSelectedImage(null);
    };

    const handleUseStyle = () => {
        if (!currentUser) {
            onLoginRequest();
            closePopup();
            return;
        }
        onImageClick();
        closePopup();
    };

    if (imagesWithClones.length === 0) {
        return null;
    }
    
    return (
        <>
            <div 
                className="relative w-full group"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                <div className="overflow-hidden -mx-2">
                    <div
                        className="flex"
                        onTransitionEnd={handleTransitionEnd}
                        style={{
                            transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)`,
                            transition: isTransitioning ? 'transform 0.5s ease-in-out' : 'none',
                        }}
                    >
                        {imagesWithClones.map((image, index) => (
                        <div 
                            key={`${image.id}-${index}`}
                            className="flex-shrink-0"
                            style={{ width: `${100 / itemsPerPage}%` }}
                            >
                            <GalleryItem
                                    src={image.url}
                                    alt={image.alt}
                                    onClick={() => handleImageClickInternal(image.url, image.alt)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {GALLERY_IMAGES.length > itemsPerPage && (
                    <>
                        <button
                            onClick={handlePrev}
                            className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 bg-gray-800/60 border border-gray-700 text-white rounded-full p-2 hover:bg-purple-600/80 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                            aria-label="Image précédente"
                        >
                            <ChevronLeftIcon className="w-6 h-6" />
                        </button>
                        <button
                            onClick={handleNext}
                            className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 bg-gray-800/60 border border-gray-700 text-white rounded-full p-2 hover:bg-purple-600/80 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                            aria-label="Image suivante"
                        >
                            <ChevronRightIcon className="w-6 h-6" />
                        </button>
                    </>
                )}
            </div>

            {selectedImage && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 animate-fade-in-up" 
                    onClick={closePopup}
                >
                    <div 
                        className="relative bg-gray-800 rounded-lg shadow-2xl flex flex-col overflow-hidden w-auto h-auto max-w-[90vw] max-h-[90vh] border-x-4 border-gray-700" 
                        onClick={e => e.stopPropagation()}
                    >
                        <header className="flex-shrink-0 p-4 flex justify-between items-center border-b border-gray-700 bg-gray-900/50">
                            <h3 className="text-2xl font-bold font-orbitron text-purple-300 truncate flex-1 mr-4 text-left">{selectedImage.alt}</h3>
                            <button onClick={closePopup} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
                        </header>
                        
                        <div className="relative overflow-hidden flex-shrink min-h-0 flex items-center justify-center bg-black/20">
                             {/* max-h calc accounts for approx header (70px) + footer (80px) + padding to ensure full popup fits in 90vh */}
                            <img 
                                src={selectedImage.url} 
                                alt={selectedImage.alt} 
                                className="block max-w-full max-h-[calc(90vh-10rem)] w-auto h-auto object-contain shadow-sm"
                            />
                        </div>

                        <footer className="flex-shrink-0 p-4 border-t border-gray-700 bg-gray-900/50 flex justify-center">
                            <button 
                                onClick={handleUseStyle}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
                            >
                                Crée ton univers et ton visuel
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </>
    );
};

export default ExampleGallery;
