import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PriorityBadge } from '@/components/ui/priority-badge';

describe('UI Components', () => {
  describe('Button', () => {
    it('renders with default variant', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
    });

    it('renders with destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole('button', { name: /delete/i });
      expect(button).toBeInTheDocument();
    });

    it('renders as disabled', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button', { name: /disabled/i });
      expect(button).toBeDisabled();
    });
  });

  describe('Badge', () => {
    it('renders with default variant', () => {
      render(<Badge>New</Badge>);
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('renders priority badge', () => {
      render(<PriorityBadge priority="critical" />);
      expect(screen.getByText('Crítica')).toBeInTheDocument();
    });

    it('renders priority with score', () => {
      render(<PriorityBadge priority="high" score={85.5} />);
      expect(screen.getByText('Alta')).toBeInTheDocument();
      expect(screen.getByText('(85.5)')).toBeInTheDocument();
    });
  });

  describe('Card', () => {
    it('renders card with content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Test content</p>
          </CardContent>
        </Card>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });
  });

  describe('PriorityBadge', () => {
    const priorities = [
      { label: 'critical', text: 'Crítica', color: 'bg-red-500/20' },
      { label: 'high', text: 'Alta', color: 'bg-orange-500/20' },
      { label: 'medium', text: 'Media', color: 'bg-yellow-500/20' },
      { label: 'low', text: 'Baja', color: 'bg-green-500/20' },
      { label: 'info', text: 'Info', color: 'bg-blue-500/20' },
    ] as const;

    priorities.forEach(({ label, text }) => {
      it(`renders ${label} priority correctly`, () => {
        render(<PriorityBadge priority={label} />);
        expect(screen.getByText(text)).toBeInTheDocument();
      });
    });
  });
});
