import { type RefObject } from 'react';

export function useRefs(refs: RefObject<HTMLInputElement | HTMLSelectElement>[]) {
  function clearRef(ref: RefObject<HTMLInputElement | HTMLSelectElement>) {
    if (ref.current) {
      ref.current.value = '';
    }
  }

  function clearRefs(refs: RefObject<HTMLInputElement | HTMLSelectElement>[]) {
    refs.forEach(clearRef);
  }

  function clearAllRefs() {
    clearRefs(refs);
  }

  return { clearAllRefs, clearRefs, clearRef };
}
