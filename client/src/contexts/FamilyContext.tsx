import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
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
  const { isAuthenticated } = useAuth();
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null);

  const { data: families = [], isLoading } = useQuery<Family[]>({
    queryKey: ['/api/families'],
    enabled: isAuthenticated,
  });

  // Auto-select first family if none selected
  useEffect(() => {
    if (families.length > 0 && !currentFamily) {
      setCurrentFamily(families[0]);
    }
  }, [families, currentFamily]);

  // Clear current family if user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentFamily(null);
    }
  }, [isAuthenticated]);

  const value: FamilyContextType = {
    currentFamily,
    families,
    setCurrentFamily,
    isLoading,
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
