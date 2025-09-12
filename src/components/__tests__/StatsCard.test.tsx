import { render, screen } from '@testing-library/react';
import { StatsCard } from '../Dashboard/StatsCard';

describe('StatsCard', () => {
  const mockProps = {
    title: 'Total Users',
    value: '1,234',
    change: '+12%',
    changeType: 'positive' as const,
    icon: '👥'
  };

  it('renders stats card with correct data', () => {
    render(<StatsCard {...mockProps} />);
    
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('+12%')).toBeInTheDocument();
  });

  it('applies correct styling for positive change', () => {
    render(<StatsCard {...mockProps} />);
    
    const changeElement = screen.getByText('+12%');
    expect(changeElement).toHaveClass('text-green-600');
  });

  it('applies correct styling for negative change', () => {
    const negativeProps = {
      ...mockProps,
      change: '-5%',
      changeType: 'negative' as const
    };
    
    render(<StatsCard {...negativeProps} />);
    
    const changeElement = screen.getByText('-5%');
    expect(changeElement).toHaveClass('text-red-600');
  });

  it('renders without change when not provided', () => {
    const propsWithoutChange = {
      title: 'Total Users',
      value: '1,234',
      icon: '👥'
    };
    
    render(<StatsCard {...propsWithoutChange} />);
    
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.queryByText(/[+-]\d+%/)).not.toBeInTheDocument();
  });
});