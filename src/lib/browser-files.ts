/**
 * Copies text without putting it anywhere persistent. Callers must not pass
 * TOTP secrets, backup codes, or tokens to a logging wrapper.
 */
export async function copyText(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error('Clipboard access is not available in this browser.');
  }
  await navigator.clipboard.writeText(text);
}

/** Triggers a local file download for content the user chose to save. */
export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
