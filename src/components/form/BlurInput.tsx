import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';

// Small utility to compose two functions
const callAll = (...fns: Array<((...a: any[]) => void) | undefined>) =>
  (...args: any[]) => fns.forEach(fn => fn && fn(...args));

// Wrap a standard input to ensure parent onBlur + RHF field.onBlur both run
export function BlurInput({ name, onParentBlur, ...rest }: { name: string; onParentBlur?: () => void } & React.InputHTMLAttributes<HTMLInputElement>) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <input
          {...rest}
          {...field}
          onBlur={callAll(onParentBlur, field.onBlur)}
          onChange={(e) => field.onChange(e.target.value)}
        />
      )}
    />
  );
}
