"use client";
import { useEffect, useRef, useCallback } from "react";

interface StackEntry { sheetId: string; close: () => void; }
const sheetStack: StackEntry[] = [];
let globalListenerInstalled = false;
let sheetIdCounter = 0;

function ensureGlobalPopstateListener() {
  if (globalListenerInstalled || typeof window === "undefined") return;
  globalListenerInstalled = true;
  window.addEventListener("popstate", (event: PopStateEvent) => {
    if (sheetStack.length === 0) return;
    const targetSheetId = (event.state as { sheetId?: string } | null)?.sheetId;
    if (targetSheetId) {
      const targetIdx = sheetStack.findIndex((e) => e.sheetId === targetSheetId);
      if (targetIdx >= 0) {
        while (sheetStack.length > targetIdx + 1) {
          const top = sheetStack.pop();
          top?.close();
        }
        return;
      }
      return;
    }
    while (sheetStack.length > 0) { const top = sheetStack.pop(); top?.close(); }
  });
}

export function useSheetBrowserHistory(isOpen: boolean, onClose: () => void) {
  const entryRef = useRef<StackEntry | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    ensureGlobalPopstateListener();
    if (!isOpen) return;
    const sheetId = `sheet_${++sheetIdCounter}`;
    const entry: StackEntry = { sheetId, close: () => onCloseRef.current() };
    entryRef.current = entry;
    sheetStack.push(entry);
    window.history.pushState({ sheetId }, "");
    return () => {
      if (entryRef.current) {
        const idx = sheetStack.indexOf(entryRef.current);
        if (idx >= 0) sheetStack.splice(idx, 1);
        entryRef.current = null;
      }
    };
  }, [isOpen]);

  const goBack = useCallback(() => { window.history.back(); }, []);
  return { goBack };
}
