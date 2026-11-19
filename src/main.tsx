import ReactDOM from 'react-dom/client';
import App from './App';
import { ensureBrowserStorage } from './lib/session';
import './index.css';

ensureBrowserStorage();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />);
