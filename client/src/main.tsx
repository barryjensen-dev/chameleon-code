import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled promise rejection:', event.reason);
  event.preventDefault(); // Prevent the default behavior
});

// Handle uncaught errors
window.addEventListener('error', (event) => {
  console.warn('Uncaught error:', event.error);
  event.preventDefault(); // Prevent the default behavior
});

createRoot(document.getElementById("root")!).render(<App />);
