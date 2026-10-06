// "/" locally, "/pcc-records-system/" on GitHub Pages.
export const BASE_URL = import.meta.env.BASE_URL;

export const ROUTER_BASENAME = BASE_URL.replace(/\/$/, '') || '/';

export function withBase(path: string) {
  if (/^[a-z]+:/i.test(path)) return path;
  return BASE_URL + path.replace(/^\//, '');
}
