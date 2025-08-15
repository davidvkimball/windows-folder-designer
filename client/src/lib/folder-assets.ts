// Import all folder icon assets
import folderBack16 from "../assets/folder-icons/folder-back-16.png";
import folderBack20 from "../assets/folder-icons/folder-back-20.png";
import folderBack24 from "../assets/folder-icons/folder-back-24.png";
import folderBack32 from "../assets/folder-icons/folder-back-32.png";
import folderBack40 from "../assets/folder-icons/folder-back-40.png";
import folderBack64 from "../assets/folder-icons/folder-back-64.png";
import folderBack256 from "../assets/folder-icons/folder-back-256.png";

import folderFront16 from "../assets/folder-icons/folder-front-16.png";
import folderFront20 from "../assets/folder-icons/folder-front-20.png";
import folderFront24 from "../assets/folder-icons/folder-front-24.png";
import folderFront32 from "../assets/folder-icons/folder-front-32.png";
import folderFront40 from "../assets/folder-icons/folder-front-40.png";
import folderFront64 from "../assets/folder-icons/folder-front-64.png";
import folderFront256 from "../assets/folder-icons/folder-front-256.png";

export const folderAssets = {
  back: {
    16: folderBack16,
    20: folderBack20,
    24: folderBack24,
    32: folderBack32,
    40: folderBack40,
    64: folderBack64,
    256: folderBack256,
  },
  front: {
    16: folderFront16,
    20: folderFront20,
    24: folderFront24,
    32: folderFront32,
    40: folderFront40,
    64: folderFront64,
    256: folderFront256,
  },
};

export function getFolderAsset(type: 'back' | 'front', size: number): string {
  // Find the closest available size
  const availableSizes = [16, 20, 24, 32, 40, 64, 256];
  const closestSize = availableSizes.reduce((prev, curr) => 
    Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev
  );
  
  return folderAssets[type][closestSize as keyof typeof folderAssets.back];
}