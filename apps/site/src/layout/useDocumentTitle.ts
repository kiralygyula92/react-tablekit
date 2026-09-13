import { useEffect } from 'react';
import { PKG_NAME } from '../pkg';

export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    document.title = title ? `${title} · ${PKG_NAME}` : PKG_NAME;
  }, [title]);
}
