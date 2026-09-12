import { createRoot } from 'react-dom/client';
import Popup from '../../src/popup/Popup';
import '../../src/popup/popup.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Popup root element was not found.');
}

createRoot(rootElement).render(<Popup />);
