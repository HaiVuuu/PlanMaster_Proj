import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import VietnameseInput from '../../src/components/VietnameseInput';

// Helper component to simulate a parent component managing state
const TestParentComponent = ({
  initialValue = '',
  as = 'input',
}: { initialValue?: string; as?: 'input' | 'textarea' }) => {
  const [value, setValue] = useState(initialValue);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValue(e.target.value);
  };
  return (
    <VietnameseInput
      as={as}
      value={value}
      onChange={handleChange}
      data-testid="vietnamese-input"
    />
  );
};

describe('VietnameseInput', () => {
  it('should update value correctly for normal English typing', () => {
    render(<TestParentComponent />);
    const input = screen.getByTestId('vietnamese-input');

    fireEvent.change(input, { target: { value: 'hello' } });
    expect(input).toHaveValue('hello');
  });

  it('should handle Vietnamese Telex typing correctly (composition events)', () => {
    render(<TestParentComponent />);
    const input = screen.getByTestId('vietnamese-input');

    // Simulate typing 'xays' to get 'xáy'
    // 1. Type 'x'
    fireEvent.change(input, { target: { value: 'x' } });
    expect(input).toHaveValue('x');

    // 2. Start composition (e.g., typing 'a' for 'xa')
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: 'xa' } });
    expect(input).toHaveValue('xa'); // Value updates internally

    // 3. Composition update (e.g., typing 'y' for 'xay')
    fireEvent.compositionUpdate(input);
    fireEvent.change(input, { target: { value: 'xay' } });
    expect(input).toHaveValue('xay');

    // 4. Composition update (e.g., typing 's' for 'xays' which should become 'xáy')
    fireEvent.compositionUpdate(input);
    fireEvent.change(input, { target: { value: 'xáy' } }); // The IME usually replaces the composed text
    expect(input).toHaveValue('xáy');

    // 5. End composition
    fireEvent.compositionEnd(input);
    // After compositionEnd, the final value should be correctly set and propagated
    expect(input).toHaveValue('xáy');
  });

  it('should not trigger onChange during composition, only at compositionEnd', () => {
    const handleChange = vi.fn();
    render(<VietnameseInput value="" onChange={handleChange} data-testid="vietnamese-input" />);
    const input = screen.getByTestId('vietnamese-input');

    fireEvent.change(input, { target: { value: 'x' } });
    expect(handleChange).toHaveBeenCalledTimes(1);

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: 'xa' } });
    expect(handleChange).toHaveBeenCalledTimes(1); // Should NOT be called during composition

    fireEvent.compositionEnd(input);
    fireEvent.change(input, { target: { value: 'xá' } }); // Simulate final value after composition
    expect(handleChange).toHaveBeenCalledTimes(2); // Should be called once at the end
    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({ target: expect.objectContaining({ value: 'xá' }) }));
  });
});