import React, { useEffect, useRef } from 'react';

function ChatThread({ children }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [children]);

  return (
    <div className="chat-thread-container" role="log">
      {children}
      <div ref={bottomRef} />
    </div>
  );
}

export default ChatThread;
