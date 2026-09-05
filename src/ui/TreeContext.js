import { createContext } from 'react';

export const TreeContext = createContext({
  dynasties: [],
  setDynasties: () => {},
  baseCalendarId: '',
  setBaseCalendarId: () => {},
  userCalendars: [],
});
