export type ProductCategory = 'Componentes' | 'Periféricos' | 'Almacenamiento' | 'Gaming' | 'Accesorios'

export interface Product {
  id: string
  name: string
  description: string
  /** Precio de venta normal */
  price: number
  image: string
  category: ProductCategory
  /** Stock para venta directa (se aparta si está en rifa) */
  stock: number
}

export type RaffleStatus = 'active' | 'draw' | 'finished' | 'cancelled'

export interface Raffle {
  id: string
  /** Producto que se rifa (se aparta del stock de venta) */
  productId: string
  name: string
  description: string
  /** Margen configurable: porcentaje extra sobre el precio del producto */
  marginPercent: number
  /** Cantidad de boletos (spec flexible — puede cambiar) */
  ticketCount: number
  /** Precio por boleto (calculado) */
  ticketPrice: number
  status: RaffleStatus
  createdAt: string
}

/**
 * Calcula el precio por boleto:
 * ticketPrice = (product.price × (1 + marginPercent/100)) / ticketCount
 */
export function calculateTicketPrice(
  productPrice: number,
  marginPercent: number,
  ticketCount: number,
): number {
  if (ticketCount <= 0) return 0
  const total = productPrice * (1 + marginPercent / 100)
  return Math.ceil(total / ticketCount)
}

/**
 * Productos mockeados de tecnología (venta normal).
 */
export const products: Product[] = [
  {
    id: 'p-001',
    name: 'RTX 4070 — GPU 12GB',
    description: 'Tarjeta gráfica NVIDIA GeForce RTX 4070 con 12GB GDDR6X. Ideal para gaming y renderizado.',
    price: 18000,
    image: '/images/products/rtx4070.jpg',
    category: 'Componentes',
    stock: 10,
  },
  {
    id: 'p-002',
    name: 'Ryzen 7 7800X3D — CPU',
    description: 'Procesador AMD Ryzen 7 7800X3D, 8 núcleos y 16 hilos con 3D V-Cache.',
    price: 8000,
    image: '/images/products/ryzen7.jpg',
    category: 'Componentes',
    stock: 15,
  },
  {
    id: 'p-003',
    name: 'SSD NVMe 1TB — WD Black',
    description: 'Unidad de estado sólido NVMe de 1TB con velocidades de lectura de hasta 7300 MB/s.',
    price: 1800,
    image: '/images/products/ssd1tb.jpg',
    category: 'Almacenamiento',
    stock: 30,
  },
  {
    id: 'p-004',
    name: 'Teclado mecánico RGB',
    description: 'Teclado mecánico con switches red, retroiluminación RGB y diseño compacto.',
    price: 1500,
    image: '/images/products/teclado.jpg',
    category: 'Periféricos',
    stock: 25,
  },
  {
    id: 'p-005',
    name: 'Mouse inalámbrico Logitech',
    description: 'Mouse inalámbrico de alta precisión con sensor HERO y batería de larga duración.',
    price: 800,
    image: '/images/products/mouse.jpg',
    category: 'Periféricos',
    stock: 40,
  },
  {
    id: 'p-006',
    name: 'Monitor 27" 144Hz QHD',
    description: 'Monitor gaming de 27 pulgadas, resolución QHD y 144Hz con panel IPS.',
    price: 6500,
    image: '/images/products/monitor27.jpg',
    category: 'Gaming',
    stock: 8,
  },
]

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id)
}