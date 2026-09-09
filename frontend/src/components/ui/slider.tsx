'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SliderProps {
  value?: number[];
  defaultValue?: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  className?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, defaultValue, min = 0, max = 100, step = 1, onValueChange }, ref) => {
    const currentValue = value?.[0] ?? defaultValue?.[0] ?? 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange?.([Number(e.target.value)]);
    };

    return (
      <div className="relative flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={handleChange}
          className={cn(
            'h-2 w-full cursor-pointer appearance-none rounded-full bg-muted',
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:h-4',
            '[&::-webkit-slider-thumb]:w-4',
            '[&::-webkit-slider-thumb]:rounded-full',
            '[&::-webkit-slider-thumb]:bg-primary',
            '[&::-webkit-slider-thumb]:cursor-pointer',
            '[&::-webkit-slider-thumb]:ring-2',
            '[&::-webkit-slider-thumb]:ring-ring',
            '[&::-webkit-slider-thumb]:ring-offset-2',
            '[&::-webkit-slider-thumb]:ring-offset-background',
            className
          )}
          ref={ref}
        />
        <span className="w-12 text-right text-sm font-medium">{currentValue}</span>
      </div>
    );
  }
);
Slider.displayName = 'Slider';

export { Slider };
