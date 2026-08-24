// src/logic/blocksToHtml.ts
import type { Block } from '../editor/blocks';

export function blocksToHtml(inputBlocks: any): string {
  let blocks = inputBlocks;

  if (typeof blocks === 'string') {
    try {
      blocks = JSON.parse(blocks);
    } catch (e) {
      return '';
    }
  }

  if (!blocks || !Array.isArray(blocks)) return '';

  return blocks
    .map((block, index) => {
      const bType = (block as any).type;
      
      // Fallback an toàn quét qua các thuộc tính chứa nội dung văn bản phổ biến
      const content = (block as any).html || (block as any).text || (block as any).content || (block as any).value || '';

      switch (bType) {
        case 'text':
          return `<div class="mb-4 text-gray-800 leading-relaxed">${content}</div>`;

        case 'heading': {
          const tags: Record<number, string> = { 2: 'h2', 3: 'h3', 4: 'h4' };
          const level = (block as any).level || 2;
          const tag = tags[level] || 'h2';
          const classes: Record<number, string> = {
            2: 'text-2xl font-bold text-gray-900 mt-10 mb-4',
            3: 'text-xl font-bold text-gray-900 mt-8 mb-3',
            4: 'text-lg font-bold text-gray-900 mt-6 mb-2',
          };
          const cls = classes[level] || classes[2];
          return `<${tag} class="${cls}">${content}</${tag}>`;
        }

        case 'image': {
          let imgClass = 'w-full h-auto rounded-xl shadow-md border border-gray-100';
          let containerClass = 'my-8';
          const alignment = (block as any).alignment;

          if (alignment === 'left') {
            containerClass = 'my-6 max-w-sm sm:float-left sm:mr-8 mb-6';
          } else if (alignment === 'right') {
            containerClass = 'my-6 max-w-sm sm:float-right sm:ml-8 mb-6';
          } else if (alignment === 'center') {
            containerClass = 'my-8 flex flex-col items-center justify-center text-center';
          } else if (alignment === 'full') {
            containerClass = 'my-10 w-screen max-w-none -mx-4 sm:-mx-8 md:-mx-12';
            imgClass = 'w-full h-auto md:rounded-none shadow-lg';
          }

          let imgHtml = `<img src="${(block as any).src || ''}" alt="${(block as any).alt || ''}" class="${imgClass}" loading="lazy" />`;
          
          if ((block as any).linkUrl) {
            imgHtml = `<a href="${(block as any).linkUrl}" target="_blank" rel="noopener noreferrer" class="transition-opacity hover:opacity-90 block">${imgHtml}</a>`;
          }

          const caption = (block as any).caption;
          const captionHtml = caption 
            ? `<figcaption class="mt-3 text-sm text-gray-500 italic text-center">${caption}</figcaption>` 
            : '';

          return `<figure class="${containerClass}">${imgHtml}${captionHtml}</figure>`;
        }

        case 'post-link':
          return `
            <div class="my-6 p-4 border border-blue-100 bg-blue-50/50 rounded-xl hover:bg-blue-50 transition-colors">
              <a href="/posts/${(block as any).slug || ''}" class="text-blue-700 hover:text-blue-800 font-medium inline-flex items-center text-base w-full">
                <svg class="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg> 
                <span class="hover:underline">Bài viết liên quan: ${(block as any).title || ''}</span>
              </a>
            </div>`;

        case 'affiliate-link':
          return `
            <div class="my-8 flex justify-center">
              <a href="/go/${(block as any).affiliateId || ''}" target="_blank" rel="nofollow noopener noreferrer" class="inline-flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3.5 rounded-xl shadow-[0_4px_14px_0_rgba(249,115,22,0.39)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.23)] hover:-translate-y-0.5 transition-all duration-200">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg> 
                Mua ngay ${(block as any).name || ''} (${(block as any).platform || ''})
              </a>
            </div>`;

        case 'quote':
          return `
            <blockquote class="my-8 pl-5 border-l-4 border-brand-blue bg-gray-50/80 py-4 pr-4 rounded-r-lg text-gray-700 italic text-lg leading-relaxed">
              <p>${content}</p>
            </blockquote>`;

        case 'callout':
          return `
            <div class="my-6 p-5 rounded-xl border border-blue-100 bg-blue-50/80 flex items-start space-x-4 shadow-sm">
              <div class="shrink-0 mt-1">
                <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
              </div>
              <div class="text-blue-900 leading-relaxed flex-1 font-medium">
                ${content}
              </div>
            </div>`;

        case 'code':
          return `
            <div class="my-8 rounded-xl overflow-hidden shadow-sm bg-gray-900 border border-gray-800">
              <div class="flex items-center px-4 py-2 bg-gray-800 border-b border-gray-700">
                <div class="flex space-x-1.5">
                  <div class="w-3 h-3 rounded-full bg-red-500"></div>
                  <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div class="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
              </div>
              <pre class="p-5 overflow-x-auto text-gray-100 font-mono text-[13px] leading-loose whitespace-pre-wrap"><code>${content}</code></pre>
            </div>`;

        case 'bullet-list': {
          const itemsHtml = ((block as any).items || []).map((item: string) => `<li class="mb-1">${item}</li>`).join('');
          return `<ul class="list-disc list-inside pl-5 mb-4 text-gray-800 space-y-1">${itemsHtml}</ul>`;
        }

        case 'numbered-list': {
          const itemsHtml = ((block as any).items || []).map((item: string) => `<li class="mb-1">${item}</li>`).join('');
          return `<ol class="list-decimal list-inside pl-5 mb-4 text-gray-800 space-y-1">${itemsHtml}</ol>`;
        }

        case 'table': {
          const headersHtml = ((block as any).headers || []).map((h: string) => `<th class="px-4 py-3 border-b-2 border-gray-200 bg-gray-50 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">${h}</th>`).join('');
          const rowsHtml = ((block as any).rows || []).map((row: string[], rowIndex: number) => {
            const cellsHtml = row.map((cell: string) => `<td class="px-4 py-3 border-b border-gray-100 text-sm text-gray-700">${cell}</td>`).join('');
            return `<tr class="${rowIndex === 0 ? '' : 'hover:bg-gray-50/50 transition-colors'}">${cellsHtml}</tr>`;
          }).join('');
          
          return `
            <div class="my-8 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
              <table class="w-full text-left border-collapse bg-white">
                ${headersHtml ? `<thead><tr>${headersHtml}</tr></thead>` : ''}
                <tbody>${rowsHtml}</tbody>
              </table>
            </div>`;
        }

        case 'video-embed': {
          const url = (block as any).src || '';
          let videoId = '';
          try {
            if (url.includes('youtube.com/watch?v=')) videoId = new URL(url).searchParams.get('v') || '';
            else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
          } catch (e) {}
          
          if (!videoId) return '';
          
          return `
            <div class="my-8 w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-lg bg-black relative" style="padding-bottom: 56.25%;">
              <iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/${videoId}" allowfullscreen frameborder="0" loading="lazy"></iframe>
            </div>`;
        }

        case 'divider':
          return `
            <div class="flex items-center justify-center my-10 space-x-2 opacity-50">
              <div class="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
              <div class="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
              <div class="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
            </div>`;

        case 'html-embed':
          return `<div class="my-8 w-full overflow-hidden flex justify-center">${(block as any).html || ''}</div>`;

        default:
          return '';
      }
    })
    .join('\n');
}