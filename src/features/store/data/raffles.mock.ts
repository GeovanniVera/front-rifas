import { calculateTicketPrice, getProductById, type Raffle } from './products.mock'

/**
 * Rifas mockeadas.
 *
 * Cada rifa toma un producto existente, lo aparta del stock de venta
 * y lo rifa con un margen configurable sobre el precio.
 *
 * La spec de boletos (ticketCount) es flexible — puede cambiar.
 */
const baseRaffles = [
  {
    id: 'r-001',
    productId: 'p-001', // RTX 4070 ($18,000 MXN)
    marginPercent: 7,
    ticketCount: 100,
    status: 'active' as const,
  },
  {
    id: 'r-002',
    productId: 'p-005', // Mouse ($800 MXN)
    marginPercent: 10,
    ticketCount: 50,
    status: 'active' as const,
  },
]

/**
 * Construye las rifas calculando el precio por boleto.
 */
export function buildRaffles(): Raffle[] {
  return baseRaffles.map((r) => {
    const product = getProductById(r.productId)
    return {
      id: r.id,
      productId: r.productId,
      name: product ? `Rifa — ${product.name}` : 'Rifa',
      description: product
        ? `Rifá tu ${product.name} por boletos. El producto se aparta del stock de venta.`
        : '',
      marginPercent: r.marginPercent,
      ticketCount: r.ticketCount,
      ticketPrice: product
        ? calculateTicketPrice(product.price, r.marginPercent, r.ticketCount)
        : 0,
      status: r.status,
      createdAt: new Date().toISOString(),
    }
  })
}

/**
 * Crea una rifa a partir de un producto.
 * El producto queda apartado del stock de venta (stock = 0 mientras está en rifa).
 */
export function createRaffleFromProduct(
  productId: string,
  marginPercent: number,
  ticketCount: number,
): Raffle {
  const product = getProductById(productId)
  if (!product) throw new Error('Producto no encontrado')

  return {
    id: `r-${Date.now()}`,
    productId,
    name: `Rifa — ${product.name}`,
    description: `Rifá tu ${product.name} por boletos. El producto se aparta del stock de venta.`,
    marginPercent,
    ticketCount,
    ticketPrice: calculateTicketPrice(product.price, marginPercent, ticketCount),
    status: 'active',
    createdAt: new Date().toISOString(),
  }
}