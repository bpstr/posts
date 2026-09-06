export const SITE_TITLE = 'Jani Fent';
export const SITE_DESCRIPTION = 'Notes on software systems, AI, architecture, and the web.';
export const AUTHOR = 'Jani Fent';
export const GITHUB_URL = 'https://github.com/bpstr';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const withBase = (path = '/') => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}` || '/';
};

export const DEFAULT_COVER = {
  url: 'https://images.unsplash.com/photo-1778146476147-5f8d4bd03c79?auto=format&fit=crop&w=1600&q=80',
  alt: 'Laptop and phone on a desk with source code open',
  credit: 'Bayu Syaits',
  creditUrl: 'https://unsplash.com/photos/laptop-and-phone-on-a-desk-with-coding-software-open-oYzjGQ7LCVE',
};
