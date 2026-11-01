import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Diagnostics } from './Diagnostics';
it('renders diagnostic status and explicit permission controls without transaction controls', () => {
  const html = renderToStaticMarkup(createElement(Diagnostics));
  expect(html).toContain('NestFlow host diagnostics');
  expect(html).toContain('Refresh diagnostics');
  expect(html).toContain('Connect (wallet permission)');
  expect(html).toContain('Request Polygon (137)');
  expect(html).toContain('reject in wallet');
  expect(html).toContain('aria-live="polite"');
  expect(html).toContain('Waiting for Nimiq SDK');
  expect(html).not.toContain('>Supply<');
});
