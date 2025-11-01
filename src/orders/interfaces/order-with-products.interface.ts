export interface OrderWithProducts {
  OrderItem: {
    name: any;
    price: number;
    quantity: number;
    productId: number;
  }[];
  id: number;
  totalAmount: number;
  totalItems: number;
  status: string;
  paid: boolean;
  paiddAt: Date | null;
  createdAt: Date;
  businessId: string; // Agregar businessId a la interface
}
