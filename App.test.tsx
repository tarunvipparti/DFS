
import { render } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import React from 'react';
import App from './App';

// Mocking Recharts because it uses ResizeObserver which isn't in jsdom by default
vi.mock('recharts', async () => {
  const OriginalModule = await vi.importActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: '800px', height: '400px' }}>{children}</div>
    ),
  };
});

// Fix: Destructure query methods from render result as 'screen' is not exported in this module version
test('renders DeepShield landing page', () => {
  const { getByText } = render(<App />);
  const linkElement = getByText(/DeepShield/i);
  expect(linkElement).toBeDefined();
});

// Fix: Destructure query methods from render result as 'screen' is not exported in this module version
test('renders dashboard by default', () => {
  const { getByText } = render(<App />);
  const dashboardTitle = getByText(/Audit Overview/i);
  expect(dashboardTitle).toBeDefined();
});
