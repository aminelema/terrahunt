import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScaleSliderControls } from './ScaleSliderControls';

describe('ScaleSliderControls', () => {
  it('renders dynamic size comparison copy, preset buttons, and submits on Lock In', () => {
    const onChangeRatio = vi.fn();
    const onSubmit = vi.fn();

    render(
      <ScaleSliderControls
        baseName="Philippines"
        targetName="Greece"
        guessedRatio={0.5}
        onChangeRatio={onChangeRatio}
        onSubmit={onSubmit}
        submitting={false}
      />,
    );

    expect(
      screen.getByText(/Greece is 0\.50× Philippines \(Philippines is 2\.00× larger\)/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2×' }));
    expect(onChangeRatio).toHaveBeenCalledWith(2.0);

    fireEvent.click(screen.getByRole('button', { name: /Lock In True Size/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
