// src/editor/EditorWrapper.tsx
import React from 'react';
import Editor from './Editor';

interface EditorWrapperProps {
  initialContent?: string;
  initialSeoData?: string; // Hứng chuỗi cấu hình SEO từ Astro
}

export default function EditorWrapper({ initialContent, initialSeoData }: EditorWrapperProps) {
  // Giải mã dữ liệu
  const blocks = initialContent ? JSON.parse(initialContent) : [{ type: 'text', html: '' }];
  const seoData = initialSeoData ? JSON.parse(initialSeoData) : undefined;

  return (
    <Editor 
      initialBlocks={blocks} 
      initialSeoData={seoData} // Ném data vào Editor
      onChange={() => {}} 
    />
  );
}