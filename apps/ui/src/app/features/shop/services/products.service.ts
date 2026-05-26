import { Injectable } from '@angular/core';
import { Product } from '../models/product';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly catalog: readonly Product[] = [
    { id: 'p1',  title: 'Stage 1 ECU Yazılımı',         category: 'tuning',    price: 12500, image: 'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=800&q=80',  badge: 'popular', rating: 5 },
    { id: 'p2',  title: 'Stage 2 ECU + Egzoz',          category: 'tuning',    price: 28500, originalPrice: 32000, image: 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=800&q=80', badge: 'sale', rating: 5 },
    { id: 'p3',  title: 'Seramik Kaplama 9H',           category: 'detailing', price:  9500, image: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=800&q=80', rating: 5 },
    { id: 'p4',  title: 'Tam Araç PPF Koruma',          category: 'detailing', price: 36000, image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80', badge: 'new', rating: 4 },
    { id: 'p5',  title: 'Brembo GT 6-Pot Fren Kiti',    category: 'brakes',    price: 78500, image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80', rating: 5 },
    { id: 'p6',  title: 'Performans Disk + Balata Set', category: 'brakes',    price:  4200, image: 'https://images.unsplash.com/photo-1486754735734-325b5831c3ad?auto=format&fit=crop&w=800&q=80', rating: 4 },
    { id: 'p7',  title: 'BBS CH-R 19" Jant Takımı',     category: 'wheels',    price: 64000, originalPrice: 72000, image: 'https://images.unsplash.com/photo-1626668893632-6f3a4466d109?auto=format&fit=crop&w=800&q=80', badge: 'sale', rating: 5 },
    { id: 'p8',  title: 'Michelin Pilot Sport 4 Set',   category: 'wheels',    price: 18500, image: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=800&q=80', rating: 5 },
    { id: 'p9',  title: 'Akrapovic Cat-Back Egzoz',     category: 'exhaust',   price: 42500, image: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=80', badge: 'popular', rating: 5 },
    { id: 'p10', title: 'Downpipe + Sport Cat',         category: 'exhaust',   price: 15500, image: 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=800&q=80', rating: 4 },
    { id: 'p11', title: 'Premium İç Detayl Paketi',     category: 'detailing', price:  3500, image: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=800&q=80', rating: 5 },
    { id: 'p12', title: 'Pist Hazırlık Paketi',         category: 'tuning',    price: 95000, image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80', badge: 'new', rating: 5 },
  ];

  list(): readonly Product[] {
    return this.catalog;
  }
}
