"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type CreditContextType = {
  credits: number;
  setCredits: (value: number) => void;
};

const CreditContext = createContext<CreditContextType | undefined>(undefined);

export const CreditProvider = ({ children }: { children: ReactNode }) => {
  const [credits, setCredits] = useState(0);

  return (
    <CreditContext.Provider value={{ credits, setCredits }}>
      {children}
    </CreditContext.Provider>
  );
};

// Optional: cleaner hook
export const useCredits = () => {
  const context = useContext(CreditContext);
  if (!context) {
    throw new Error("useCredits must be used inside CreditProvider");
  }
  return context;
};
