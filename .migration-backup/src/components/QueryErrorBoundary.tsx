import { ReactNode } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "./ErrorBoundary";

interface QueryErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Error boundary specifically for React Query errors.
 * Automatically resets query errors when the user clicks "Retry".
 */
export function QueryErrorBoundary({ children, fallback }: QueryErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} fallback={fallback}>
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
