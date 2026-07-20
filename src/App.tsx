import { Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import SectorPage from "./pages/SectorPage";
import AdminPage from "./pages/AdminPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/sector/:sectorId" element={<SectorPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}
