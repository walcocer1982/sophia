import React, { ComponentPropsWithoutRef, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export function AnimatedListItem({ children }) {
  const animations = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1, originY: 0 },
    exit: { scale: 0, opacity: 0 },
    transition: { type: 'spring', stiffness: 350, damping: 40 },
  };

  return (
    <motion.div {...animations} layout style={{ width: '100%', margin: '0 auto' }}>
      {children}
    </motion.div>
  );
}

export function AnimatedList({ children, className = '', delay = 1000, ...props }) {
  const [index, setIndex] = useState(0);
  const childrenArray = useMemo(() => React.Children.toArray(children), [children]);

  useEffect(() => {
    if (index < childrenArray.length - 1) {
      const timeout = setTimeout(() => {
        setIndex((prev) => (prev + 1) % childrenArray.length);
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [index, delay, childrenArray.length]);

  const itemsToShow = useMemo(() => {
    return childrenArray.slice(0, index + 1).reverse();
  }, [index, childrenArray]);

  return (
    <div {...props} className={`flex flex-col items-start gap-4 ${className}`}>      
      <AnimatePresence>
        {itemsToShow.map((item) => (
          <AnimatedListItem key={(item)?.key ?? Math.random()}>
            {item}
          </AnimatedListItem>
        ))}
      </AnimatePresence>
    </div>
  );
} 