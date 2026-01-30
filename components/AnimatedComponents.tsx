import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

// 共用動畫按鈕元件
export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
    children,
    onClick,
    disabled = false,
    className = '',
    variant = 'primary',
}) => {
    const baseClasses = 'flex items-center justify-center gap-2 rounded-lg transition-colors';

    const variantClasses = {
        primary: 'bg-slate-900 hover:bg-slate-700 text-white shadow-lg',
        secondary: 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-sm',
        danger: 'bg-red-500 hover:bg-red-600 text-white shadow-md',
        ghost: 'bg-transparent hover:bg-slate-100 text-slate-600',
    };

    return (
        <motion.button
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${variantClasses[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
            {children}
        </motion.button>
    );
};

// 動畫卡片元件
interface AnimatedCardProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    delay?: number;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
    children,
    onClick,
    className = '',
    delay = 0,
}) => {
    return (
        <motion.div
            onClick={onClick}
            className={className}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, delay }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
        >
            {children}
        </motion.div>
    );
};

// 動畫面板元件（用於展開/收起）
interface AnimatedPanelProps {
    children: React.ReactNode;
    isOpen: boolean;
    className?: string;
}

export const AnimatedPanel: React.FC<AnimatedPanelProps> = ({
    children,
    isOpen,
    className = '',
}) => {
    return (
        <motion.div
            className={className}
            initial={false}
            animate={{
                height: isOpen ? 'auto' : 0,
                opacity: isOpen ? 1 : 0,
            }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
        >
            {children}
        </motion.div>
    );
};

// 淡入動畫容器
interface FadeInProps {
    children: React.ReactNode;
    delay?: number;
    className?: string;
}

export const FadeIn: React.FC<FadeInProps> = ({
    children,
    delay = 0,
    className = '',
}) => {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay }}
        >
            {children}
        </motion.div>
    );
};

// 動畫圖示按鈕（工具列用）
interface AnimatedIconButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    active?: boolean;
    disabled?: boolean;
    className?: string;
    title?: string;
}

export const AnimatedIconButton: React.FC<AnimatedIconButtonProps> = ({
    children,
    onClick,
    active = false,
    disabled = false,
    className = '',
    title,
}) => {
    return (
        <motion.button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`p-2 rounded-lg transition-colors ${active
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
            whileHover={{ scale: disabled ? 1 : 1.1 }}
            whileTap={{ scale: disabled ? 1 : 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
            {children}
        </motion.button>
    );
};

// 動畫縮圖項目（底部貼圖列表用）
interface AnimatedThumbnailProps {
    children: React.ReactNode;
    onClick?: () => void;
    active?: boolean;
    className?: string;
}

export const AnimatedThumbnail: React.FC<AnimatedThumbnailProps> = ({
    children,
    onClick,
    active = false,
    className = '',
}) => {
    return (
        <motion.div
            onClick={onClick}
            className={className}
            whileHover={{ scale: 1.08, y: -2 }}
            whileTap={{ scale: 0.95 }}
            animate={{
                scale: active ? 1.05 : 1,
                borderColor: active ? '#1e293b' : '#e5e7eb',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
            {children}
        </motion.div>
    );
};
