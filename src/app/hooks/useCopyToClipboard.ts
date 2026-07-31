import { useState, useCallback } from 'react';

/**
 * Hook reutilizável para copiar texto para o clipboard com feedback visual.
 * @param resetDelay Tempo em ms para resetar o estado "copied" (default: 2000)
 */
export function useCopyToClipboard(resetDelay = 2000) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), resetDelay);
      } catch (err) {
        console.error('Falha ao copiar para clipboard:', err);
      }
    },
    [resetDelay]
  );

  return { copied, copyToClipboard };
}
