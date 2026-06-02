import { Signal, signal } from '@angular/core';

/**
 * Basit "stale-while-revalidate" önbellek.
 *
 * Ekranlar her açılışta API'yi beklemek yerine son veriyi anında gösterir,
 * arka planda tazeler. `peek()` cache'i senkron döndürür; `revalidate()` ağdan
 * çeker, eşzamanlı çağrıları tekleştirir (in-flight dedupe).
 */
export class Swr<T> {
  private readonly _value = signal<T | null>(null);
  readonly value: Signal<T | null> = this._value.asReadonly();
  private inflight: Promise<T> | null = null;

  peek(): T | null { return this._value(); }

  revalidate(fetcher: () => Promise<T>): Promise<T> {
    if (this.inflight) { return this.inflight; }
    this.inflight = fetcher()
      .then(v => { this._value.set(v); return v; })
      .finally(() => { this.inflight = null; });
    return this.inflight;
  }

  set(v: T): void { this._value.set(v); }
  clear(): void { this._value.set(null); }
}
