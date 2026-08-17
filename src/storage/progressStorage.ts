import type { StateStorage } from 'zustand/middleware';

/**
 * Persistence boundary for learning state. Domain/store code depends on the
 * storage contract, not on localStorage itself, so a later sync adapter can
 * preserve the same state transitions and migration format.
 */
const localProgressStorage:StateStorage={
  getItem:(name)=>window.localStorage.getItem(name),
  setItem:(name,value)=>window.localStorage.setItem(name,value),
  removeItem:(name)=>window.localStorage.removeItem(name)
};

export function getProgressStorage():StateStorage{return localProgressStorage;}
