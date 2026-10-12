// Explicit editorial formats. No executable files, HTML, SVG or Office macros.
const formats = {
  png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', webp:'image/webp',
  pdf:'application/pdf', txt:'text/plain', csv:'text/csv',
  docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip:'application/zip', mp3:'audio/mpeg', m4a:'audio/mp4', wav:'audio/wav',
  mp4:'video/mp4', webm:'video/webm',
};
export const imageAccept = '.png,.jpg,.jpeg,.webp';
export const fileAccept = Object.keys(formats).map(k => '.' + k).join(',');
export async function validateEditorialFile(file, imagesOnly=false) {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const mime = formats[extension];
  const image = Boolean(mime?.startsWith('image/'));
  if (!mime || (imagesOnly && !image)) throw new Error(imagesOnly ? 'Use PNG, JPEG ou WebP.' : 'Formato não permitido. Consulte os tipos de arquivo indicados.');
  const max = image ? 8 * 1024 * 1024 : 20 * 1024 * 1024;
  if (!file.size || file.size > max) throw new Error(`O arquivo deve ter até ${image ? 8 : 20} MB e não pode estar vazio.`);
  // Browsers sometimes supply octet-stream/empty MIME or legacy aliases for ZIP/CSV/WAV.
  const aliases = {zip:['application/x-zip-compressed'],csv:['application/vnd.ms-excel','text/plain'],wav:['audio/x-wav']};
  if (file.type && file.type !== 'application/octet-stream' && file.type !== mime && !aliases[extension]?.includes(file.type)) throw new Error('O tipo do arquivo não corresponde à extensão.');
  const bytes = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  const ascii = new TextDecoder().decode(bytes);
  const starts = (...values) => values.every((v,i) => bytes[i] === v);
  const valid = extension === 'png' ? starts(137,80,78,71,13,10,26,10)
    : ['jpg','jpeg'].includes(extension) ? starts(255,216,255)
    : extension === 'webp' ? ascii.startsWith('RIFF') && ascii.slice(8,12) === 'WEBP'
    : extension === 'pdf' ? ascii.startsWith('%PDF-')
    : ['zip','docx','xlsx','pptx'].includes(extension) ? starts(80,75,3,4) || starts(80,75,5,6)
    : extension === 'wav' ? ascii.startsWith('RIFF') && ascii.slice(8,12) === 'WAVE'
    : ['mp4','m4a'].includes(extension) ? ascii.slice(4,8) === 'ftyp'
    : extension === 'webm' ? starts(26,69,223,163)
    : extension === 'mp3' ? ascii.startsWith('ID3') || (bytes[0] === 255 && (bytes[1] & 224) === 224)
    : !bytes.includes(0) && !/^\s*(?:<!doctype\s+html|<html|<svg|<script)/i.test(ascii);
  if (!valid) throw new Error('Conteúdo do arquivo inválido para esse formato.');
  return {extension, mime, image};
}
