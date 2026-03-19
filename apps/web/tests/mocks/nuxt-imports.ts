import { vi } from "vitest";

export const navigateToMock = vi.fn();
export const useRouteMock = vi.fn(() => ({
  path: "/",
  params: {},
}));
export const useFetchMock = vi.fn();

export function navigateTo(...args: Parameters<typeof navigateToMock>) {
  return navigateToMock(...args);
}

export function useRoute() {
  return useRouteMock();
}

export function useFetch(...args: Parameters<typeof useFetchMock>) {
  return useFetchMock(...args);
}
