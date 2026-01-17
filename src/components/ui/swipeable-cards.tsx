/**
 * Swipeable Cards Component
 * Mobile-friendly swipeable card carousel for displaying content sections
 */

import * as React from "react";
import { cn } from "~/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface SwipeableCardProps {
  children: React.ReactNode;
  className?: string;
}

export interface SwipeableCardsProps {
  children: React.ReactNode;
  className?: string;
  showIndicators?: boolean;
  showNavigation?: boolean;
  onCardChange?: (index: number) => void;
  initialIndex?: number;
}

/**
 * Individual card wrapper for swipeable carousel
 */
export function SwipeableCard({ children, className }: SwipeableCardProps) {
  return (
    <div
      className={cn(
        "flex-shrink-0 w-full snap-center px-4",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Container for swipeable cards with touch gesture support
 */
export function SwipeableCards({
  children,
  className,
  showIndicators = true,
  showNavigation = true,
  onCardChange,
  initialIndex = 0,
}: SwipeableCardsProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null);

  const childrenArray = React.Children.toArray(children);
  const totalCards = childrenArray.length;

  // Minimum swipe distance to trigger card change
  const minSwipeDistance = 50;

  const scrollToIndex = React.useCallback((index: number) => {
    if (containerRef.current) {
      const container = containerRef.current;
      const cardWidth = container.offsetWidth;
      container.scrollTo({
        left: cardWidth * index,
        behavior: "smooth",
      });
    }
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < totalCards - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      scrollToIndex(newIndex);
      onCardChange?.(newIndex);
    } else if (isRightSwipe && currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      scrollToIndex(newIndex);
      onCardChange?.(newIndex);
    }
  };

  const handleScroll = React.useCallback(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const scrollPosition = container.scrollLeft;
      const cardWidth = container.offsetWidth;
      const newIndex = Math.round(scrollPosition / cardWidth);

      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < totalCards) {
        setCurrentIndex(newIndex);
        onCardChange?.(newIndex);
      }
    }
  }, [currentIndex, totalCards, onCardChange]);

  const goToCard = (index: number) => {
    if (index >= 0 && index < totalCards) {
      setCurrentIndex(index);
      scrollToIndex(index);
      onCardChange?.(index);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      goToCard(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < totalCards - 1) {
      goToCard(currentIndex + 1);
    }
  };

  // Scroll to initial index on mount
  React.useEffect(() => {
    if (initialIndex > 0) {
      scrollToIndex(initialIndex);
    }
  }, [initialIndex, scrollToIndex]);

  return (
    <div className={cn("relative", className)}>
      {/* Navigation Arrows */}
      {showNavigation && totalCards > 1 && (
        <>
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className={cn(
              "absolute left-1 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-background/90 shadow-md border transition-all",
              "hover:bg-background active:scale-95",
              currentIndex === 0 && "opacity-0 pointer-events-none"
            )}
            aria-label="Previous card"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            onClick={goToNext}
            disabled={currentIndex === totalCards - 1}
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-background/90 shadow-md border transition-all",
              "hover:bg-background active:scale-95",
              currentIndex === totalCards - 1 && "opacity-0 pointer-events-none"
            )}
            aria-label="Next card"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </>
      )}

      {/* Cards Container */}
      <div
        ref={containerRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onScroll={handleScroll}
      >
        {children}
      </div>

      {/* Card Indicators */}
      {showIndicators && totalCards > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {childrenArray.map((_, index) => (
            <button
              key={index}
              onClick={() => goToCard(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                index === currentIndex
                  ? "bg-primary w-4"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              aria-label={`Go to card ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

SwipeableCard.displayName = "SwipeableCard";
SwipeableCards.displayName = "SwipeableCards";
