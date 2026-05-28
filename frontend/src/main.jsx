import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { fetchUser } from './redux/slices/authSlice';
import './styles/main.scss'
import App from './App.jsx'

// Initialize auth state
store.dispatch(fetchUser());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
