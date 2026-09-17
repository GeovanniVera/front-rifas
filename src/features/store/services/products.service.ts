import { client } from '@lib/api/client'
import type { ApiResponse } from '@lib/api/types/api-response'

export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  stock: number
  imageUrl?: string
  createdAt?: string
}

export interface CreateProductData {
  name: string
  description?: string
  price: number
  category: string
  stock: number
  image: File
}

export interface UpdateProductData {
  name?: string
  description?: string
  price?: number
  category?: string
  stock?: number
  image?: File
}

export const productService = {
  /** Lista productos disponibles (tienda pública) */
  listAvailable: (): Promise<ApiResponse<Product[]>> =>
    client.get<Product[]>('/products'),

  /** Lista todos los productos (admin) */
  listAll: (): Promise<ApiResponse<Product[]>> =>
    client.get<Product[]>('/admin/products'),

  /** Obtiene un producto */
  get: (id: string): Promise<ApiResponse<Product>> =>
    client.get<Product>(`/products/${id}`),

  /** Crea producto con imagen obligatoria (multipart) */
  create: (data: CreateProductData): Promise<ApiResponse<Product>> => {
    const form = new FormData()
    form.append('name', data.name)
    if (data.description) form.append('description', data.description)
    form.append('price', String(data.price))
    form.append('category', data.category)
    form.append('stock', String(data.stock))
    form.append('image', data.image)
    return client.post<Product>('/admin/products', form)
  },

  /** Actualiza producto (imagen opcional) */
  update: (id: string, data: UpdateProductData): Promise<ApiResponse<Product>> => {
    const form = new FormData()
    if (data.name) form.append('name', data.name)
    if (data.description) form.append('description', data.description)
    if (data.price != null) form.append('price', String(data.price))
    if (data.category) form.append('category', data.category)
    if (data.stock != null) form.append('stock', String(data.stock))
    if (data.image) form.append('image', data.image)
    return client.put<Product>(`/admin/products/${id}`, form)
  },

  /** Elimina producto */
  delete: (id: string): Promise<ApiResponse<void>> =>
    client.delete<void>(`/admin/products/${id}`),
}