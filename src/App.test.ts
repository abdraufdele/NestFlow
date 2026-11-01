import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { App } from './App';
it('shows the connection state and honest transaction limitation before balances exist', () => {
  const html = renderToStaticMarkup(createElement(App));
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  expect(text).toContain('Your USDT, with room to spend.');
  expect(text).toContain('Connect wallet');
  expect(text).toContain('Not verified on device');
  expect(text).not.toContain('0 USDT');
});
