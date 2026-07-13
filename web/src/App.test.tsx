import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Smoke Test', () => {
  it('renders without crashing and displays login', () => {
    render(<App />);
    expect(screen.getByText(/Accordant/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/admin@accordant.eu/i)).toBeInTheDocument();
  });
});
