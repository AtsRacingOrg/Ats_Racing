import {
  ActivatedRouteSnapshot,
  DetachedRouteHandle,
  RouteReuseStrategy,
} from '@angular/router';

/**
 * Keeps /dashboard/overview and /dashboard/files alive in memory.
 * Navigating between them no longer destroys & re-creates the component,
 * so data is always instantly visible without any "loading" flash.
 */
export class DashboardReuseStrategy implements RouteReuseStrategy {
  private readonly cache = new Map<string, DetachedRouteHandle>();

  /** Routes we want to keep alive */
  private static keep = new Set(['overview', 'files']);

  private key(route: ActivatedRouteSnapshot): string {
    return route.routeConfig?.path ?? '';
  }

  /** Should Angular detach (cache) this route when navigating away? */
  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return DashboardReuseStrategy.keep.has(this.key(route));
  }

  /** Store the detached component tree */
  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    if (handle) {
      this.cache.set(this.key(route), handle);
    }
  }

  /** Should Angular reattach a cached component instead of creating new? */
  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return this.cache.has(this.key(route));
  }

  /** Return the cached component tree */
  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    return this.cache.get(this.key(route)) ?? null;
  }

  /** Standard: reuse the same route instance when path is identical */
  shouldReuseRoute(
    future: ActivatedRouteSnapshot,
    curr: ActivatedRouteSnapshot,
  ): boolean {
    return future.routeConfig === curr.routeConfig;
  }
}
