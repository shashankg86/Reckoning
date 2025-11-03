import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';

// This HOC ensures parent onBlur is invoked alongside RHF's field.onBlur for any input-like child
export function withBlurForwarding<P extends { onBlur?: () => void }>(
  Comp: React.ComponentType<P & { onBlur: React.FocusEventHandler<any> }>
) {
  return function BlurForward(props: P) {
    const { control } = useFormContext();
    return (
      <Controller
        name={(props as any).name}
        control={control}
        render={({ field }) => (
          <Comp
            {...(props as any)}
            {...field}
            onBlur={(e: any) => {
              props.onBlur?.();
              field.onBlur();
            }}
          />
        )}
      />
    );
  };
}
