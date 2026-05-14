import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Index from './Index';

describe('Index page', () => {
    it('renders the hackathon heading', () => {
        render(<Index />);
        expect(screen.getByRole('heading', { name: /Letterfest Hackathon 2026/i })).toBeVisible();
    });

    it('renders the team placeholder', () => {
        render(<Index />);
        expect(screen.getByText(/\[team name\]/i)).toBeVisible();
    });
});
