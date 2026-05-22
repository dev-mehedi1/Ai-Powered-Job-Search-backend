export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export const getPaginationOptions = (query: any): PaginationOptions => {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20));
  return { page, limit };
};

export const getPaginationMeta = (
  total: number,
  options: PaginationOptions
): PaginationMeta => {
  const totalPages = Math.ceil(total / options.limit);
  return {
    total,
    page: options.page,
    limit: options.limit,
    totalPages,
    hasNext: options.page < totalPages,
    hasPrev: options.page > 1,
  };
};

export const getPaginationSkip = (options: PaginationOptions): number => {
  return (options.page - 1) * options.limit;
};
