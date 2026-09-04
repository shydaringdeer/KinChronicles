import { createContext } from 'react';

export const TreeContext = createContext({
  dynasties: [],
  setDynasties: () => {},
});
