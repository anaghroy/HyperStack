import React from 'react';

// Custom high-quality SVGs for File Types to match premium IDE aesthetics

export const JSIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#F7DF1E"/>
    <path d="M12 17.5C12 18.5 11.5 19.5 9.5 19.5C8 19.5 7.5 18.5 7.5 18M11.5 21V11M21 16C21 18.5 19 20 16 20C14 20 13 18.5 13 18V17H15.5C15.5 18 16 18.5 17 18.5C18 18.5 18.5 18 18.5 17C18.5 16 18 15.5 15.5 14.5C13.5 13.5 13 12.5 13 11C13 8.5 15 7 17 7C19 7 20 8.5 20 9.5H17.5C17.5 8.5 17 8.5 16.5 8.5C15.5 8.5 15.5 9 15.5 10C15.5 11 16 11.5 18.5 12.5C20.5 13.5 21 14.5 21 16Z" fill="black"/>
  </svg>
);

export const ReactIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#20232A"/>
    <ellipse cx="12" cy="12" rx="4" ry="10" transform="rotate(30 12 12)" stroke="#61DAFB" strokeWidth="1"/>
    <ellipse cx="12" cy="12" rx="4" ry="10" transform="rotate(90 12 12)" stroke="#61DAFB" strokeWidth="1"/>
    <ellipse cx="12" cy="12" rx="4" ry="10" transform="rotate(150 12 12)" stroke="#61DAFB" strokeWidth="1"/>
    <circle cx="12" cy="12" r="2" fill="#61DAFB"/>
  </svg>
);

export const TSIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#3178C6"/>
    <path d="M12 17.5C12 18.5 11.5 19.5 9.5 19.5C8 19.5 7.5 18.5 7.5 18M11.5 21V12.5H7.5V10.5H15.5V12.5H11.5V21M21 16C21 18.5 19 20 16 20C14 20 13 18.5 13 18V17H15.5C15.5 18 16 18.5 17 18.5C18 18.5 18.5 18 18.5 17C18.5 16 18 15.5 15.5 14.5C13.5 13.5 13 12.5 13 11C13 8.5 15 7 17 7C19 7 20 8.5 20 9.5H17.5C17.5 8.5 17 8.5 16.5 8.5C15.5 8.5 15.5 9 15.5 10C15.5 11 16 11.5 18.5 12.5C20.5 13.5 21 14.5 21 16Z" fill="white"/>
  </svg>
);

export const CSSIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.5 3L6 20L12 22L18 20L19.5 3H4.5Z" fill="#1572B6"/>
    <path d="M12 20.5L16.5 19L17.5 5H12V20.5Z" fill="#33A9DC"/>
    <path d="M12 8.5H8.5L8.75 11.5H12V14L12 14.25L9.25 13.5L9 11H6.5L7 16L12 17.5V8.5Z" fill="white"/>
  </svg>
);

export const JSONIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 5C9 3.5 8 2 6 2C4 2 3 3.5 3 5V9C3 10.5 2 11.5 2 12C2 12.5 3 13.5 3 15V19C3 20.5 4 22 6 22C8 22 9 20.5 9 19" stroke="#5dbd09" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M15 5C15 3.5 16 2 18 2C20 2 21 3.5 21 5V9C21 10.5 22 11.5 22 12C22 12.5 21 13.5 21 15V19C21 20.5 20 22 18 22C16 22 15 20.5 15 19" stroke="#5dbd09" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const HTMLIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.5 3L6 20L12 22L18 20L19.5 3H4.5Z" fill="#E34F26"/>
    <path d="M12 20.5L16.5 19L17.5 5H12V20.5Z" fill="#EF652A"/>
    <path d="M12 8.5H8.5L8.75 11.5H12V14L12 14.25L9.25 13.5L9 11H6.5L7 16L12 17.5V8.5Z" fill="white"/>
  </svg>
);

export const FolderIcon = ({ size = 18, open = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient
        id={`folderGradient-${open}`}
        x1="3"
        y1="5"
        x2="21"
        y2="20"
        gradientUnits="userSpaceOnUse"
      >
        {open ? (
          <>
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
          </>
        ) : (
          <>
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="100%" stopColor="#3B82F6" />
          </>
        )}
      </linearGradient>

      <filter
        id={`shadow-${open}`}
        x="0"
        y="0"
        width="24"
        height="24"
        filterUnits="userSpaceOnUse"
      >
        <feDropShadow
          dx="0"
          dy="1"
          stdDeviation="1.2"
          floodColor="#1D4ED8"
          floodOpacity="0.18"
        />
      </filter>
    </defs>

    <path
      d="M3 7C3 5.89543 3.89543 5 5 5H9.5L11.2 6.7C11.575 7.075 12.084 7.286 12.615 7.286H19C20.1046 7.286 21 8.18143 21 9.286V10H3V7Z"
      fill={open ? "#DBEAFE" : "#E0F2FE"}
    />

    {/* Folder Front */}
    <path
      d="M3 9C3 7.89543 3.89543 7 5 7H19C20.1046 7 21 7.89543 21 9V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V9Z"
      fill={`url(#folderGradient-${open})`}
      filter={`url(#shadow-${open})`}
    />
    <path
      d="M5 7H19C19.5523 7 20 7.44772 20 8V8.4H4V8C4 7.44772 4.44772 7 5 7Z"
      fill="white"
      fillOpacity="0.18"
    />
  </svg>
);

export const FileIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V9L13 2Z" fill="#E6EDF7"/>
    <path d="M13 2V9H20L13 2Z" fill="#4b73b6"/>
  </svg>
);

export const SCSSIcon = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background */}
    <rect width="24" height="24" rx="5" fill="#dc448e" />

    {/* SCSS Text */}
    <path
      d="M7.8 16.8C8.4 17.2 9.2 17.4 10 17.4C11.3 17.4 12.2 16.8 12.2 15.7C12.2 14.8 11.6 14.3 10.4 13.9C9.5 13.6 9.2 13.3 9.2 12.9C9.2 12.5 9.5 12.2 10.1 12.2C10.7 12.2 11.2 12.4 11.6 12.6L12 11.4C11.5 11.1 10.9 10.9 10.1 10.9C8.8 10.9 8 11.7 8 12.8C8 13.7 8.7 14.2 9.8 14.6C10.7 14.9 11 15.2 11 15.7C11 16.2 10.6 16.5 9.9 16.5C9.3 16.5 8.6 16.3 8.1 16L7.8 16.8Z"
      fill="white"
    />

    <path
      d="M13.2 16.8C13.8 17.2 14.6 17.4 15.4 17.4C16.7 17.4 17.6 16.8 17.6 15.7C17.6 14.8 17 14.3 15.8 13.9C14.9 13.6 14.6 13.3 14.6 12.9C14.6 12.5 14.9 12.2 15.5 12.2C16.1 12.2 16.6 12.4 17 12.6L17.4 11.4C16.9 11.1 16.3 10.9 15.5 10.9C14.2 10.9 13.4 11.7 13.4 12.8C13.4 13.7 14.1 14.2 15.2 14.6C16.1 14.9 16.4 15.2 16.4 15.7C16.4 16.2 16 16.5 15.3 16.5C14.7 16.5 14 16.3 13.5 16L13.2 16.8Z"
      fill="white"
    />
  </svg>
);

export const getFileIcon = (filename, open = false) => {
  if (!filename) return <FolderIcon open={open} />;
  const name = filename.toLowerCase();
  
  if (name.endsWith('.js') || name.endsWith('.cjs') || name.endsWith('.mjs')) return <JSIcon />;
  if (name.endsWith('.jsx')) return <ReactIcon />;
  if (name.endsWith('.ts')) return <TSIcon />;
  if (name.endsWith('.tsx')) return <ReactIcon />; // Or custom TSX
  if (name.endsWith('.css') || name.endsWith('.css')) return <CSSIcon />;
  if (name.endsWith('.scss') || name.endsWith('.scss')) return <SCSSIcon />;
  if (name.endsWith('.json')) return <JSONIcon />;
  if (name.endsWith('.html')) return <HTMLIcon />;
  
  // if no extension or unknown
  if (!name.includes('.')) return <FolderIcon open={open} />;
  
  return <FileIcon />;
};
