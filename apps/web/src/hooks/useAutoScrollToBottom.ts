import { useEffect, useRef } from "react";

export function useAutoScrollToBottom(dependency: unknown, options: { disabled?: boolean } = {}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (options.disabled) {
      return;
    }
    const list = listRef.current;
    if (!list) {
      return;
    }

    let frameId = 0;
    const scrollToBottom = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        list.scrollTop = list.scrollHeight;
      });
    };

    scrollToBottom();

    if (typeof ResizeObserver === "undefined") {
      return () => cancelAnimationFrame(frameId);
    }

    const observer = new ResizeObserver(scrollToBottom);
    observer.observe(list);
    if (list.firstElementChild) {
      observer.observe(list.firstElementChild);
    }

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [dependency, options.disabled]);

  return listRef;
}
