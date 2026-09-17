import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productService, type CreateProductData, type UpdateProductData } from '../services/products.service'

export function useProductsAvailable() {
  return useQuery({
    queryKey: ['store', 'products'],
    queryFn: async () => {
      const response = await productService.listAvailable()
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al listar productos')
      }
      return response.data
    },
  })
}

export function useProductsAdmin() {
  return useQuery({
    queryKey: ['admin', 'products'],
    queryFn: async () => {
      const response = await productService.listAll()
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al listar productos')
      }
      return response.data
    },
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['store', 'products', id],
    queryFn: async () => {
      const response = await productService.get(id)
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al obtener producto')
      }
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateProductData) => productService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['store', 'products'] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductData }) =>
      productService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['store', 'products'] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => productService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['store', 'products'] })
    },
  })
}