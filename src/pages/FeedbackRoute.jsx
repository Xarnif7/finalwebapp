import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FeedbackIsolated from './FeedbackIsolated';

// This component creates a completely isolated route for feedback
// that bypasses the main Layout system
export default function FeedbackRoute() {
  return (
    <Router>
      <Routes>
        <Route path="/feedback/:requestId" element={<FeedbackIsolated />} />
      </Routes>
    </Router>
  );
}
