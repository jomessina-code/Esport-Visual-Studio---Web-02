
import type { ManualTextLayer } from '../types';

// Internal utility for high-quality stepped downscaling
// Reduces blurriness when scaling down significantly (e.g. 1024 -> 576) by doing it in multiple smaller steps.
const drawImageStepped = (
    img: HTMLImageElement | HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
) => {
    // If upscaling or only slight downscaling (>= 75% of original), use direct draw with high quality
    if (width >= img.width * 0.75) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, x, y, width, height);
        return;
    }

    // For significant downscaling, use multiple steps to preserve sharpness
    let curSource = img;
    let curW = img.width;
    let curH = img.height;

    // Step down by ~25% each iteration until we are close to the target size
    while (curW * 0.75 > width) {
        const newW = Math.floor(curW * 0.75);
        const newH = Math.floor(curH * 0.75);
        
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = newW;
        tmpCanvas.height = newH;
        const tmpCtx = tmpCanvas.getContext('2d');
        if (!tmpCtx) break; // Should not happen, fallback to final draw if it does

        tmpCtx.imageSmoothingEnabled = true;
        tmpCtx.imageSmoothingQuality = 'high';
        tmpCtx.drawImage(curSource, 0, 0, newW, newH);

        curSource = tmpCanvas;
        curW = newW;
        curH = newH;
    }

    // Final draw to the destination context at exact target size
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(curSource, x, y, width, height);
};

export const resizeAndCropImage = (
  imageUrl: string,
  targetWidth: number,
  targetHeight: number,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Important for canvas with data URLs
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }

      const imgRatio = img.width / img.height;
      const targetRatio = targetWidth / targetHeight;

      let drawWidth = targetWidth;
      let drawHeight = targetHeight;
      let x = 0;
      let y = 0;

      // This logic implements "object-fit: cover"
      if (imgRatio > targetRatio) {
        // Image is wider than the target canvas, so we crop the sides
        drawHeight = targetHeight;
        drawWidth = drawHeight * imgRatio;
        x = (targetWidth - drawWidth) / 2;
        y = 0;
      } else {
        // Image is taller than (or has the same aspect ratio as) the target canvas, so we crop the top and bottom
        drawWidth = targetWidth;
        drawHeight = drawWidth / imgRatio;
        x = 0;
        y = (targetHeight - drawHeight) / 2;
      }

      // Use stepped drawing for potentially better quality if downscaling significantly
      drawImageStepped(img, ctx, x, y, drawWidth, drawHeight);
      
      resolve(canvas.toDataURL('image/png')); 
    };
    img.onerror = (err) => {
      console.error("Image load error for resizing", err);
      reject(new Error('Failed to load image for resizing'));
    };
    img.src = imageUrl;
  });
};

export const cropImage = (
  imageUrl: string,
  cropArea: { x: number; y: number; width: number; height: number } // in percentages
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const sourceX = img.width * cropArea.x;
      const sourceY = img.height * cropArea.y;
      const sourceWidth = img.width * cropArea.width;
      const sourceHeight = img.height * cropArea.height;

      const canvas = document.createElement('canvas');
      canvas.width = sourceWidth;
      canvas.height = sourceHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        sourceWidth,
        sourceHeight
      );

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => {
      console.error("Image load error for cropping", err);
      reject(new Error('Failed to load image for cropping'));
    };
    img.src = imageUrl;
  });
};

export const scaleImage = (
  imageUrl: string,
  scale: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Use Math.round to ensure integer dimensions for canvas
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }

      drawImageStepped(img, ctx, 0, 0, canvas.width, canvas.height);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => {
      console.error("Image load error for scaling", err);
      reject(new Error('Failed to load image for scaling'));
    };
    img.src = imageUrl;
  });
};

export const scaleImageToWidth = (
  imageUrl: string,
  targetWidth: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Calculate new height to maintain aspect ratio
      const scale = targetWidth / img.width;
      const targetHeight = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }

      // Use HQ stepped downscaling
      drawImageStepped(img, ctx, 0, 0, canvas.width, canvas.height);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => {
      console.error("Image load error for scaling to width", err);
      reject(new Error('Failed to load image for scaling'));
    };
    img.src = imageUrl;
  });
};

export const composeScaledImage = (
    imageUrl: string,
    targetWidth: number,
    targetHeight: number,
    scale: number,
    offsetX: number,
    offsetY: number
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                 return reject(new Error('Could not get canvas context'));
            }

            // Fill with black background
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, targetWidth, targetHeight);

            // Calculate drawn image dimensions
            const drawnWidth = img.width * scale;
            const drawnHeight = img.height * scale;

            // Calculate centered position + manual offsets
            const x = (targetWidth - drawnWidth) / 2 + offsetX;
            const y = (targetHeight - drawnHeight) / 2 + offsetY;

            // Use HQ stepped downscaling for composition
            drawImageStepped(img, ctx, x, y, drawnWidth, drawnHeight);
            
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = (err) => reject(err);
        img.src = imageUrl;
    });
}


// Alias requested by brief, using existing robust implementation
export const resizeImage = scaleImage;

export const composeImageWithText = async (
  baseImageUrl: string,
  textLayers: ManualTextLayer[]
): Promise<string> => {
  // 1. Pre-load fonts to ensure WYSIWYG rendering on canvas. 
  // Crucial: load the BOLD (700) version specifically as that's what we use.
  const uniqueFonts = [...new Set(textLayers.filter(l => l.isVisible).map(l => l.fontFamily))];
  try {
      // We explicitly request weight 700 (bold) to match our rendering
      await Promise.all(uniqueFonts.map(font => document.fonts.load(`700 1em "${font}"`)));
  } catch (e) {
      console.warn("Some fonts might not have loaded correctly before rendering.", e);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }

      // Draw the base image
      // Ensure high quality for final composition too
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0);

      // Draw each visible text layer
      textLayers.forEach(layer => {
        if (!layer.isVisible || !layer.text.trim()) return;

        const fontSizePx = (img.height * layer.fontSize) / 100; 
        const x = (img.width * layer.x) / 100;
        const y = (img.height * layer.y) / 100;

        ctx.font = `bold ${fontSizePx}px "${layer.fontFamily}", sans-serif`;
        ctx.textAlign = 'center';
        // Switch to 'middle' baseline for more reliable standard centering across engines
        ctx.textBaseline = 'middle';

        // Reset standard shadow before applying specific effects
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Apply Effects
        if (layer.effect === 'shadow') {
            ctx.shadowColor = 'rgba(0, 0, 0, 1)';
            ctx.shadowBlur = fontSizePx * 0.05;
            ctx.shadowOffsetX = fontSizePx * 0.08;
            ctx.shadowOffsetY = fontSizePx * 0.08;
            ctx.fillStyle = layer.color;
            ctx.fillText(layer.text, x, y);
        } 
        else if (layer.effect === 'outline') {
            ctx.lineWidth = fontSizePx * 0.08;
            ctx.strokeStyle = '#000000';
            ctx.lineJoin = 'round';
            // strokeText also needs to follow the same baseline/positioning
            ctx.strokeText(layer.text, x, y);
            ctx.fillStyle = layer.color;
            ctx.fillText(layer.text, x, y);
        }
        else if (layer.effect === 'neon') {
            // Multi-pass for stronger neon glow matching CSS text-shadow
            // Pass 1: Wide outer glow
            ctx.shadowColor = layer.color;
            ctx.shadowBlur = fontSizePx * 0.8;
            ctx.fillText(layer.text, x, y);
            
            // Pass 2: Medium glow for intensity
            ctx.shadowBlur = fontSizePx * 0.4;
            ctx.fillText(layer.text, x, y);

            // Pass 3: Core white/bright text
            ctx.shadowBlur = fontSizePx * 0.1;
            ctx.fillStyle = '#FFFFFF'; 
            ctx.fillText(layer.text, x, y);
        }
        else {
            // Default subtle shadow for readability
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = fontSizePx * 0.1;
            ctx.fillStyle = layer.color;
            ctx.fillText(layer.text, x, y);
        }
      });

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => {
      console.error("Image load error for composition", err);
      reject(new Error('Failed to load base image for composition'));
    };
    img.src = baseImageUrl;
  });
};

const colorDistance = (c1: number[], c2: number[]): number => {
  return Math.sqrt(Math.pow(c1[0] - c2[0], 2) + Math.pow(c1[1] - c2[1], 2) + Math.pow(c1[2] - c2[2], 2));
};

export const detectMargins = (imageBase64: string): Promise<boolean> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const { width, height } = img;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(false); return; }
            
            ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, width, height).data;

            const isWhite = (r: number, g: number, b: number) => r > 240 && g > 240 && b > 240;
            const scanDepth = 10; // Scan 10px border
            const thresholdRatio = 0.15; // 15% white pixels threshold

            const checkRegion = (startX: number, startY: number, w: number, h: number) => {
                let whiteCount = 0;
                const totalPixels = w * h;
                for (let y = startY; y < startY + h; y++) {
                    for (let x = startX; x < startX + w; x++) {
                        const idx = (y * width + x) * 4;
                        if (isWhite(data[idx], data[idx+1], data[idx+2])) {
                            whiteCount++;
                        }
                    }
                }
                return (whiteCount / totalPixels) > thresholdRatio;
            };

            // Check Top Border
            if (checkRegion(0, 0, width, scanDepth)) { resolve(true); return; }
            // Check Bottom Border
            if (checkRegion(0, height - scanDepth, width, scanDepth)) { resolve(true); return; }
            // Check Left Border
            if (checkRegion(0, 0, scanDepth, height)) { resolve(true); return; }
            // Check Right Border
            if (checkRegion(width - scanDepth, 0, scanDepth, height)) { resolve(true); return; }

            resolve(false);
        };
        img.onerror = () => {
            resolve(false);
        };
        img.src = `data:image/png;base64,${imageBase64}`;
    });
};
