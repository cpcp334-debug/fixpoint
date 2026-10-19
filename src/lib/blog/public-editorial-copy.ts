/** Presentation cleanup only. Stored articles, titles, URLs and metadata stay intact. */
export function cleanPublicEditorialText(value: string): string {
 const cleaned = value
  .replace(/\s*Unique editorial markers:[^\n]*?(?:\.(?=\s|$)|$)/gi, '')
  .replace(/\s*علامات تحريرية فريدة:[^\n]*?(?:[.。](?=\s|$)|$)/g, '')
  .replace(/ServiceLocation\.covered and operational scheduling are the sources of truth when a service page exists\./g, 'Ask the team to confirm service availability and a suitable visit time for your address.')
  .replace(/ServiceLocation\.covered والجدولة التشغيلية هما مصدر الحقيقة عندما توجد صفحة خدمة\./g, 'يؤكد الفريق إمكانية تقديم الخدمة والموعد المناسب لعنوان العقار.');
 const seen = new Set<string>();
 return cleaned.split(/\n\n+/).map(block=>block.trim()).filter(block=>{
  if(!block) return false;
  // Preserve headings (and their incoming fragment links) and short labels.
  if(block.startsWith('#') || block.length<80) return true;
  const key=block.replace(/\s+/g,' ').trim();
  if(seen.has(key)) return false;
  seen.add(key); return true;
 }).join('\n\n');
}
