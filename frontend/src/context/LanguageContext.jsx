import React, { createContext, useContext, useState } from 'react';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(
    () => localStorage.getItem('sougui_lang') || 'fr'
  );

  const toggleLang = () => {
    setLang(prev => {
      const next = prev === 'fr' ? 'en' : 'fr';
      localStorage.setItem('sougui_lang', next);
      return next;
    });
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
