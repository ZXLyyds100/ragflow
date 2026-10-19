import { createContext, useContext } from 'react';

// Explicit fixture owner, not a logged-in user or a real canvas permission check.
export const OwnerTenantIdContext = createContext<string | undefined>(undefined);
export const useOwnerTenantId = () => useContext(OwnerTenantIdContext);
