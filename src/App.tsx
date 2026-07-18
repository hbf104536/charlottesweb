import { Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import SectorPage from "./pages/SectorPage";
import DepartmentPage from "./pages/DepartmentPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/sector/:sectorId" element={<SectorPage />} />
      <Route path="/sector/:sectorId/:departmentId" element={<DepartmentPage />} />
    </Routes>
  );
}
