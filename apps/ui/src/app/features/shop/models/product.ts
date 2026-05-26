export type Category = 'tuning' | 'detailing' | 'brakes' | 'wheels' | 'exhaust';

export interface Product {
  readonly id: string;
  readonly title: string;
  readonly category: Category;
  readonly price: number;
  readonly originalPrice?: number;
  readonly image: string;
  readonly badge?: 'new' | 'sale' | 'popular';
  readonly rating: number;
}

export const CATEGORIES: ReadonlyArray<{ value: Category; label: string }> = [
  { value: 'tuning', label: 'ECU Tuning' },
  { value: 'detailing', label: 'Detayl' },
  { value: 'brakes', label: 'Frenleme' },
  { value: 'wheels', label: 'Jant & Lastik' },
  { value: 'exhaust', label: 'Egzoz' },
];
