import React from 'react';
import {forwardRef} from 'react';
import {cva,type VariantProps} from 'class-variance-authority';
import {clsx} from 'clsx';
import {twMerge} from 'tailwind-merge';
const variants=cva('btn',{variants:{variant:{default:'btn-primary',secondary:'btn-secondary',dark:'btn-dark',ghost:'btn-ghost'},size:{default:'',small:'btn-small'}},defaultVariants:{variant:'default',size:'default'}});
export const Button=forwardRef<HTMLButtonElement,React.ButtonHTMLAttributes<HTMLButtonElement>&VariantProps<typeof variants>>(({className,variant,size,...props},ref)=><button ref={ref} className={twMerge(clsx(variants({variant,size}),className))} {...props}/>);
