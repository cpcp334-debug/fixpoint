// Exact ECMAScript whitespace; shared with the database availability query.
export const EDITORIAL_WHITESPACE = '[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]';
export const EDITORIAL_MARKER_PATTERNS = [
 { prefix: 'Unique editorial markers:', ending: '\\.', ignoreCase: true },
 { prefix: 'علامات تحريرية فريدة:', ending: '[.。]', ignoreCase: false },
].map(rule => ({
 ...rule,
 startPattern: `${EDITORIAL_WHITESPACE}*${rule.prefix}`,
 pattern: `${EDITORIAL_WHITESPACE}*${rule.prefix}[^\\n]*?(?:${rule.ending}(?=${EDITORIAL_WHITESPACE}|$)|$)`,
}));

export function removePublicEditorialMarkers(value: string): string {
 return EDITORIAL_MARKER_PATTERNS.reduce(
  (text, rule) => text.replace(new RegExp(rule.pattern, rule.ignoreCase ? 'gi' : 'g'), ''),
  value.replace(/\r\n?/g, '\n'),
 );
}

/** Presentation cleanup only. Stored articles, titles, URLs and metadata stay intact. */
export function cleanPublicEditorialText(value: string): string {
 const cleaned = removePublicEditorialMarkers(value)
  // Browser form submissions may use CRLF; paragraph parsing expects LF.
  .replace(/\r\n?/g, "\n")
  .replace(/AI-generated illustrative image/gi, "Illustrative image")
  .replace(/AI-generated illustration/gi, "Illustration")
  .replace(/AI-generated/gi, "illustrative")
  .replace(/توضيحية مولدة بالذكاء الاصطناعي/g, "توضيحية")
  .replace(/مولدة بالذكاء الاصطناعي/g, "توضيحية")
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