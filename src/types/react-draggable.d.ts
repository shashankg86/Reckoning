declare module 'react-draggable' {
    import * as React from 'react';

    export interface DraggableBounds {
        left?: number;
        right?: number;
        top?: number;
        bottom?: number;
    }

    export interface DraggableProps {
        allowAnyClick?: boolean;
        axis?: 'both' | 'x' | 'y' | 'none';
        bounds?: DraggableBounds | string | false;
        cancel?: string;
        children?: React.ReactNode;
        defaultClassName?: string;
        defaultClassNameDragging?: string;
        defaultClassNameDragged?: string;
        defaultPosition?: { x: number; y: number };
        disabled?: boolean;
        grid?: [number, number];
        handle?: string;
        offsetParent?: HTMLElement;
        onMouseDown?: (e: MouseEvent) => void;
        onStart?: (e: any, data: any) => void | false;
        onDrag?: (e: any, data: any) => void | false;
        onStop?: (e: any, data: any) => void | false;
        position?: { x: number; y: number };
        positionOffset?: { x: number | string; y: number | string };
        scale?: number;
        nodeRef?: React.RefObject<HTMLElement>;
    }

    export interface DraggableData {
        node: HTMLElement;
        x: number;
        y: number;
        deltaX: number;
        deltaY: number;
        lastX: number;
        lastY: number;
    }

    export type DraggableEvent = React.MouseEvent<HTMLElement | SVGElement> | React.TouchEvent<HTMLElement | SVGElement> | MouseEvent | TouchEvent;

    export default class Draggable extends React.Component<DraggableProps, any> { }
}
