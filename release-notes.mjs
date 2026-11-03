export function releaseNotesText(value, limit = 8000) {
  if (typeof value !== 'string') return '';
  return value.slice(0, 32000).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/!\[([^\]]*)\]\([^\n]*?\)/g, '$1').replace(/\[([^\]]+)\]\([^\n]*?\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '').replace(/\*\*([^*\n]+)\*\*/g, '$1').replace(/`([^`\n]+)`/g, '$1').trim().slice(0, limit);
}
