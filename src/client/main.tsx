import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if (import.meta.env.DEV) {
  void import('./stores/chatStore').then(({ useChatStore }) => {
    const globalWindow = window as Window & { __chatStore?: typeof useChatStore };
    globalWindow.__chatStore = useChatStore;
  });
}
