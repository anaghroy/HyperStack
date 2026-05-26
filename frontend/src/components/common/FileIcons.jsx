import React from 'react';

// Custom high-quality SVGs for File Types to match premium IDE aesthetics

export const JSIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#F7DF1E"/>
    <path d="M12 17.5C12 18.5 11.5 19.5 9.5 19.5C8 19.5 7.5 18.5 7.5 18M11.5 21V11M21 16C21 18.5 19 20 16 20C14 20 13 18.5 13 18V17H15.5C15.5 18 16 18.5 17 18.5C18 18.5 18.5 18 18.5 17C18.5 16 18 15.5 15.5 14.5C13.5 13.5 13 12.5 13 11C13 8.5 15 7 17 7C19 7 20 8.5 20 9.5H17.5C17.5 8.5 17 8.5 16.5 8.5C15.5 8.5 15.5 9 15.5 10C15.5 11 16 11.5 18.5 12.5C20.5 13.5 21 14.5 21 16Z" fill="black"/>
  </svg>
);

export const ReactIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#20232A"/>
    <ellipse cx="12" cy="12" rx="4" ry="10" transform="rotate(30 12 12)" stroke="#61DAFB" strokeWidth="1"/>
    <ellipse cx="12" cy="12" rx="4" ry="10" transform="rotate(90 12 12)" stroke="#61DAFB" strokeWidth="1"/>
    <ellipse cx="12" cy="12" rx="4" ry="10" transform="rotate(150 12 12)" stroke="#61DAFB" strokeWidth="1"/>
    <circle cx="12" cy="12" r="2" fill="#61DAFB"/>
  </svg>
);

export const TSIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#3178C6"/>
    <path d="M12 17.5C12 18.5 11.5 19.5 9.5 19.5C8 19.5 7.5 18.5 7.5 18M11.5 21V12.5H7.5V10.5H15.5V12.5H11.5V21M21 16C21 18.5 19 20 16 20C14 20 13 18.5 13 18V17H15.5C15.5 18 16 18.5 17 18.5C18 18.5 18.5 18 18.5 17C18.5 16 18 15.5 15.5 14.5C13.5 13.5 13 12.5 13 11C13 8.5 15 7 17 7C19 7 20 8.5 20 9.5H17.5C17.5 8.5 17 8.5 16.5 8.5C15.5 8.5 15.5 9 15.5 10C15.5 11 16 11.5 18.5 12.5C20.5 13.5 21 14.5 21 16Z" fill="white"/>
  </svg>
);

export const CSSIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.5 3L6 20L12 22L18 20L19.5 3H4.5Z" fill="#1572B6"/>
    <path d="M12 20.5L16.5 19L17.5 5H12V20.5Z" fill="#33A9DC"/>
    <path d="M12 8.5H8.5L8.75 11.5H12V14L12 14.25L9.25 13.5L9 11H6.5L7 16L12 17.5V8.5Z" fill="white"/>
  </svg>
);

export const JSONIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 5C9 3.5 8 2 6 2C4 2 3 3.5 3 5V9C3 10.5 2 11.5 2 12C2 12.5 3 13.5 3 15V19C3 20.5 4 22 6 22C8 22 9 20.5 9 19" stroke="#E6EDF7" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M15 5C15 3.5 16 2 18 2C20 2 21 3.5 21 5V9C21 10.5 22 11.5 22 12C22 12.5 21 13.5 21 15V19C21 20.5 20 22 18 22C16 22 15 20.5 15 19" stroke="#E6EDF7" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const HTMLIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.5 3L6 20L12 22L18 20L19.5 3H4.5Z" fill="#E34F26"/>
    <path d="M12 20.5L16.5 19L17.5 5H12V20.5Z" fill="#EF652A"/>
    <path d="M12 8.5H8.5L8.75 11.5H12V14L12 14.25L9.25 13.5L9 11H6.5L7 16L12 17.5V8.5Z" fill="white"/>
  </svg>
);

export const FolderIcon = ({ size = 16, open = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {open ? (
      <path d="M3 6C3 4.89543 3.89543 4 5 4H10L12 6H19C20.1046 6 21 6.89543 21 8V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z" fill="#5B8CFF"/>
    ) : (
      <path d="M3 6C3 4.89543 3.89543 4 5 4H10L12 6H19C20.1046 6 21 6.89543 21 8V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z" fill="#8AB4FF"/>
    )}
  </svg>
);

export const FileIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V9L13 2Z" fill="#E6EDF7"/>
    <path d="M13 2V9H20L13 2Z" fill="#A9B7D0"/>
  </svg>
);

export const getFileIcon = (filename, open = false) => {
  if (!filename) return <FileIcon />;
  const name = filename.toLowerCase();
  
  if (name.endsWith('.js') || name.endsWith('.cjs') || name.endsWith('.mjs')) return <JSIcon />;
  if (name.endsWith('.jsx')) return <ReactIcon />;
  if (name.endsWith('.ts')) return <TSIcon />;
  if (name.endsWith('.tsx')) return <ReactIcon />; // Or custom TSX
  if (name.endsWith('.css') || name.endsWith('.scss')) return <CSSIcon />;
  if (name.endsWith('.json')) return <JSONIcon />;
  if (name.endsWith('.html')) return <HTMLIcon />;
  
  // if no extension or unknown
  if (!name.includes('.')) return <FolderIcon open={open} />;
  
  return <FileIcon />;
};
