import React, { useEffect, useRef } from "react";
import "~/../ScrollingClients.css";

interface ScrollingClientsProps {
  logos: string[]; // Array of logo URLs or text representing logos
  animationDuration?: number; // Duration for a full scroll animation
}

const ScrollingClients: React.FC<ScrollingClientsProps> = ({
  logos,
  animationDuration = 20,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const scrollElement = scrollRef.current;

    if (scrollElement) {
      scrollElement.style.animation = `scroll-logos ${animationDuration}s linear infinite`;
    }
  }, [animationDuration]);

  return (
    <div className="py-5 w-[90%] m-auto">
      <div className="text-center  m-auto w-[100%] text-sm font-medium text-gray-600">
        <div className="flex items-center">
          <div className="flex-grow h-[1px] bg-gray-300 max-w-[100%]" />
          <span className="px-1 text-lg">Our Trusted Partners Are:</span>
          <div className="flex-grow h-[1px] bg-gray-300 max-w-[100%]" />
        </div>
      </div>
      <div className="client-logo-container">
        <div ref={scrollRef} className="client-logo-scroll">
          {logos.concat(logos).map((logo, index) => (
            <div key={index} className="client-logo">
              <img src={logo} alt={`Client logo ${index}`} />
            </div>
          ))}
        </div>
      </div>
      <hr className="flex-grow border-gray-300" />
    </div>
  );
};

export default ScrollingClients;
