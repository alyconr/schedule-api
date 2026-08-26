import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { AccessScope, CoordinationScopeItem } from "../types/auth";
import { initialCoordinationId } from "../utils/coordinationScope";

interface CoordinationScopeContextValue {
  activeCoordinationId: number | null;
  setActiveCoordinationId: (id: number | null) => void;
  scope: AccessScope | null;
  setScope: (scope: AccessScope | null) => void;
  availableCoordinations: CoordinationScopeItem[];
  isGlobal: boolean;
}

const CoordinationScopeContext = createContext<CoordinationScopeContextValue | null>(null);

export function CoordinationScopeProvider({ children }: { children: ReactNode }) {
  const [activeCoordinationId, setActiveCoordinationId] = useState<number | null>(null);
  const [scope, setScope] = useState<AccessScope | null>(null);

  const availableCoordinations = scope?.coordinations ?? [];
  const isGlobal = scope?.is_global ?? false;

  useEffect(() => {
    if (!scope) return;
    setActiveCoordinationId(initialCoordinationId(scope));
  }, [scope]);

  return (
    <CoordinationScopeContext.Provider
      value={{
        activeCoordinationId,
        setActiveCoordinationId,
        scope,
        setScope,
        availableCoordinations,
        isGlobal,
      }}
    >
      {children}
    </CoordinationScopeContext.Provider>
  );
}

export function useCoordinationScope() {
  const ctx = useContext(CoordinationScopeContext);
  if (!ctx) {
    throw new Error("useCoordinationScope must be used within CoordinationScopeProvider");
  }
  return ctx;
}
