import { createContext, useContext, useState, ReactNode } from "react";
import type { Family } from "@shared/schema";

interface FamilyContextType {
  currentFamily: Family | null;
  families: Family[];
  setCurrentFamily: (family: Family | null) => void;
  isLoading: boolean;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

interface FamilyProviderProps {
  children: ReactNode;
}

export function FamilyProvider({ children }: FamilyProviderProps) {
  // Demo family for development
  const demoFamily: Family = {
    id: 1,
    name: "The Smith Family",
    createdBy: "1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const [currentFamily] = useState<Family | null>(demoFamily);
  const families = [demoFamily];

  const value: FamilyContextType = {
    currentFamily,
    families,
    setCurrentFamily: () => {}, // No-op for demo
    isLoading: false,
  };

  return (
    <FamilyContext.Provider value={value}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const context = useContext(FamilyContext);
  if (context === undefined) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
}
