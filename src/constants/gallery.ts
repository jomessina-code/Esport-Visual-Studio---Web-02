

// The user provided a new list of URLs to replace the gallery content.
// The request is to have these images, randomly placed, without repetition.

const uniqueImages = [
    {
        id: 'gallery-1',
        url: 'https://i.postimg.cc/vm3vMXKF/a-stunning-vertical-e-sport-poster-png-compressed.jpg',
        alt: 'Visuel E-sport Vertical',
    },
    {
        id: 'gallery-2',
        url: 'https://i.postimg.cc/1zJKPMdP/Affiche-affiche-esport-11-carr-(1)-png-compressed.jpg',
        alt: 'Affiche Esport Carrée',
    },
    {
        id: 'gallery-3',
        url: 'https://i.postimg.cc/mr8SRVnW/Affiche-affiche-esport-31-bannire-(1)-png-compressed.jpg',
        alt: 'Bannière Esport 3:1',
    },
    {
        id: 'gallery-4',
        url: 'https://i.postimg.cc/6QYhwzPN/are-ne-re-aliste-carre-1024x1024px-2025-11-10-0658-png-compressed.jpg',
        alt: 'Arène Réaliste',
    },
    {
        id: 'gallery-5',
        url: 'https://i.postimg.cc/k5fy9wHq/brickworld-brawl-carre-1024x1024px-2025-11-12-1959-png-compressed.jpg',
        alt: 'Brickworld Brawl',
    },
    {
        id: 'gallery-6',
        url: 'https://i.postimg.cc/wB0kHFr9/confrontation-xen-carre-1024x1024px-2025-11-12-1742-png-compressed.jpg',
        alt: 'Confrontation Xen',
    },
    {
        id: 'gallery-7',
        url: 'https://i.postimg.cc/bv3R8L5z/cosmic-terror-carre-1024x1024px-2025-11-12-1917-png-compressed.jpg',
        alt: 'Cosmic Terror',
    },
    {
        id: 'gallery-8',
        url: 'https://i.postimg.cc/B6bBvDrk/epic-legends-carre-1024x1024px-2025-11-04-2217-png-compressed.jpg',
        alt: 'Epic Legends 1',
    },
    {
        id: 'gallery-9',
        url: 'https://i.postimg.cc/KzjDYBXh/epic-legends-carre-1024x1024px-2025-11-05-1545-png-compressed.jpg',
        alt: 'Epic Legends 2',
    },
    {
        id: 'gallery-10',
        url: 'https://i.postimg.cc/76hnL0v4/epic-legends-carre-1024x1024px-2025-11-06-1911-png-compressed.jpg',
        alt: 'Epic Legends 3',
    },
    {
        id: 'gallery-11',
        url: 'https://i.postimg.cc/V6vWNny1/epic-legends-carre-1024x1024px-2025-11-09-2325-png-compressed.jpg',
        alt: 'Epic Legends 4',
    },
    {
        id: 'gallery-12',
        url: 'https://i.postimg.cc/k4Gv5KrM/epic-legends-carre-1024x1024px-2025-11-12-1334-png-compressed.jpg',
        alt: 'Epic Legends 5',
    },
    {
        id: 'gallery-13',
        url: 'https://i.postimg.cc/qRqx7yf7/l-abordage-ultime-carre-1024x1024px-2025-11-14-2005-png-compressed.jpg',
        alt: 'L\'Abordage Ultime',
    },
    {
        id: 'gallery-14',
        url: 'https://i.postimg.cc/63qfQnsp/l-aube-dore-e-carre-1024x1024px-2025-11-12-2013-png-compressed.jpg',
        alt: 'L\'Aube Dorée',
    },
    {
        id: 'gallery-15',
        url: 'https://i.postimg.cc/QtCJM1Lt/l-aube-dore-e-carre-1024x1024px-2025-11-12-2014-(1)-png-compressed.jpg',
        alt: 'L\'Aube Dorée 2',
    },
    {
        id: 'gallery-16',
        url: 'https://i.postimg.cc/50yStLc6/ombre-de-l-aventure-carre-1024x1024px-2025-11-16-1940-png-compressed.jpg',
        alt: 'Ombre de l\'Aventure',
    },
    {
        id: 'gallery-17',
        url: 'https://i.postimg.cc/C15sKkyf/smashverse-carre-1024x1024px-2025-11-05-1255-png-compressed.jpg',
        alt: 'Smashverse 1',
    },
    {
        id: 'gallery-18',
        url: 'https://i.postimg.cc/76hnL0v5/smashverse-carre-1024x1024px-2025-11-05-1604-png-compressed.jpg',
        alt: 'Smashverse 2',
    },
    {
        id: 'gallery-19',
        url: 'https://i.postimg.cc/ydxyNcq3/smashverse-carre-1024x1024px-2025-11-09-1612-png-compressed.jpg',
        alt: 'Smashverse 3',
    },
    {
        id: 'gallery-20',
        url: 'https://i.postimg.cc/j524jPVf/smashverse-carre-1024x1024px-2025-11-11-1252-png-compressed.jpg',
        alt: 'Smashverse 4',
    },
    {
        id: 'gallery-21',
        url: 'https://i.postimg.cc/26y75hpv/smashverse-carre-1024x1024px-2025-11-15-1309-png-compressed.jpg',
        alt: 'Smashverse 5',
    },
    {
        id: 'gallery-22',
        url: 'https://i.postimg.cc/ydGX3xBd/univers-personnalise-carre-1024x1024px-2025-11-12-1841-png-compressed.jpg',
        alt: 'Univers Personnalisé',
    },
    {
        id: 'gallery-23',
        url: 'https://i.postimg.cc/rmHCRscK/urban-kart-frenzy-carre-1024x1024px-2025-11-12-1748-png-compressed.jpg',
        alt: 'Urban Kart Frenzy',
    },
    {
        id: 'gallery-25',
        url: 'https://i.postimg.cc/SQWCJM8z/e-clat-oriental-carre-1024x1024px-2025-11-18-2141-png-compressed.jpg',
        alt: 'Éclat Oriental',
    },
    {
        id: 'gallery-26',
        url: 'https://i.postimg.cc/J7bZGkJk/univers-personnalise-carre-1024x1024px-2025-11-18-2119-png-compressed.jpg',
        alt: 'Univers Personnalisé 2',
    },
    {
        id: 'gallery-27',
        url: 'https://i.postimg.cc/zf3jNdP8/bataille-navale-en-briques-carre-1024x1024px-2025-11-19-1817-png-compressed.jpg',
        alt: 'Bataille Navale en Briques',
    },
    {
        id: 'gallery-28',
        url: 'https://i.postimg.cc/RVGPrm6r/bataille_de_briques_corsaires_carre_1024x1024px_2025_11_20_1209_(1)_png_compressed.jpg',
        alt: 'Bataille de Briques Corsaires',
    }
];

// The gallery now contains only unique images.
const imagesToDisplay = [...uniqueImages];


/**
 * Shuffles an array in place using the Fisher-Yates (aka Knuth) algorithm.
 * @param array The array to shuffle.
 * @returns The shuffled array.
 */
const shuffle = <T,>(array: T[]): T[] => {
  let currentIndex = array.length;
  let randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
};

// Shuffle the images for a random display order on each app load and export it.
export const GALLERY_IMAGES = shuffle(imagesToDisplay);
