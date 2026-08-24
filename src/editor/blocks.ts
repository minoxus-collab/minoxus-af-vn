// src/editor/blocks.ts

export type Block =
  | { type: 'text'; html: string }
  | { type: 'heading'; level: 2 | 3 | 4; text: string }
  | { 
      type: 'image'; 
      src: string; 
      alt: string; 
      caption?: string; 
      alignment: 'left' | 'center' | 'right' | 'full'; 
      linkUrl?: string 
    }
  | { type: 'post-link'; postId: string; title: string; slug: string }
  | { type: 'affiliate-link'; affiliateId: string; name: string; platform: string }
  | { type: 'quote'; text: string }
  | { type: 'code'; text: string; language?: string }
  | { type: 'bullet-list'; items: string[] }
  | { type: 'numbered-list'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'callout'; variant: 'tip' | 'warning' | 'info'; text: string }
  | { type: 'video-embed'; src: string; caption?: string }
  | { type: 'divider' }
  | { type: 'html-embed'; html: string };