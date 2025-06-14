import { createContext, useContext, ReactNode } from "react";
import type { User } from "@shared/schema";

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  // Mock user for development
  const mockUser: User = {
    id: "1",
    email: "demo@familyeats.com",
    firstName: "Demo",
    lastName: "User",
    profileImageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const value: UserContextType = {
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
