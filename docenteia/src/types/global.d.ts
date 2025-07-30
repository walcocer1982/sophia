declare global {
  interface Window {
    __NEXT_DATA__: unknown;
  }
}

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
} 