import React from 'react';

function MessageBubble({ role, children }) {
  return (
    <div className={`message-bubble ${role}`} aria-live={role === 'assistant' ? 'polite' : 'off'}>
      {children}
    </div>
  );
}

export default MessageBubble;
