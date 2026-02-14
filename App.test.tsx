import { render, screen } from '@testing-library/react';
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

test('renders DeepShield landing page', () => {
  render(<App />);
  const linkElement = screen.getByText(/DeepShield/i);
  expect(linkElement).toBeDefined();
});

test('renders dashboard by default', () => {
  render(<App />);
  const dashboardTitle = screen.getByText(/Audit Overview/i);
  expect(dashboardTitle).toBeDefined();
});
