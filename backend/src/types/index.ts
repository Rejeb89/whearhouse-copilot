import type { Request } from 'express'

/** Authenticated user payload attached by authGuard */
export interface AuthUser {
  id: number
  email: string
  role: 'ADMIN' | 'STORE_KEEPER' | 'USER'
  name?: string
}

/** Express request with authenticated user */
export interface AuthRequest extends Request {
  user?: AuthUser
}

/** Standard API success response */
export interface ApiResponse<T = any> {
  data: T
}

/** Standard API error response */
export interface ApiErrorResponse {
  error: string
}

/** Paginated response meta */
export interface PaginationMeta {
  total: number
  page: number
  limit: number
}

/** Standard paginated API success response */
export interface PaginatedResponse<T = any> {
  data: T[]
  meta: PaginationMeta
}
