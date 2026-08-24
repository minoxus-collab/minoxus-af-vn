export function removeVietnameseTones(str: string) {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a"); 
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e"); 
  str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i"); 
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o"); 
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u"); 
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y"); 
  str = str.replace(/đ/g,"d");
  return str;
}

export function slugify(str: string) {
  return removeVietnameseTones(str)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}
// Bổ sung lại hàm đếm số từ
export function calcWordCount(content: any): number {
  if (!content) return 0;
  
  let text = '';
  
  if (typeof content === 'string') {
    text = content;
  } else if (Array.isArray(content)) {
    // Nếu truyền vào mảng blocks của Editor, bóc tách text và html ra để đếm
    text = content.map((block: any) => {
      let blockText = block.text || '';
      if (block.html) {
        // Loại bỏ các thẻ HTML (như <b>, <i>, <a>) để đếm chữ cho chính xác
        blockText += ' ' + block.html.replace(/<[^>]*>?/gm, ''); 
      }
      return blockText;
    }).join(' ');
  }
  
  // Xóa khoảng trắng thừa và đếm số phần tử
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}