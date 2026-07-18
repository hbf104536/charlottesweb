import { Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import SectorPage from "./pages/SectorPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/sector/:sectorId" element={<SectorPage />} />
    </Routes>
  );
}
