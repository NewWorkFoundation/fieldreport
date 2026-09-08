import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { DataProvider } from './data/DataContext'
import { Layout } from './components/Layout'
import { V2SignupGate } from './components/V2SignupGate'
import { V3SignupGate } from './components/V3SignupGate'
import { ThemeProvider } from './lib/theme'
import { HomePage } from './pages/HomePage'
import { DeadFieldGraphic } from './pages/DeadFieldGraphic'
import { ResultsPage } from './pages/ResultsPage'
import { MapPage } from './pages/MapPage'
import {
  V3ResultsPage,
  V3ZipPromptPage,
} from './pages/v3/V3Pages'
import { V3ReceiptsPage } from './pages/v3/V3ReceiptsPage'
import { V4HomePage } from './pages/v4/V4HomePage'
import { V4AtlasPage } from './pages/v4/V4AtlasPage'
import { V4ResultsPage } from './pages/v4/V4ResultsPage'
import { V4FootprintPage } from './pages/v4/V4FootprintPage'
import { RolePickerPage } from './pages/RolePickerPage'
import { RoleReportPage } from './pages/RoleReportPage'
import {
  V4BadgesPage,
  V4ComparePage,
  V4IndustriesPage,
  V4PathwaysPage,
  V4VersusPage,
} from './pages/v4/V4MorePages'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

function V4AtlasRedirect() {
  const { cipCode = '' } = useParams()
  return <Navigate to={`/v4/map/${cipCode}`} replace />
}

export default function App() {
  return (
    <DataProvider>
      <BrowserRouter basename={basename}>
        <ThemeProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/graphic" element={<DeadFieldGraphic />} />
              <Route path="/receipts" element={<V3ReceiptsPage />} />
              <Route path="/results/:cipCode" element={<ResultsPage />} />
              <Route
                path="/results/:cipCode/place"
                element={<V3ZipPromptPage />}
              />
              <Route
                path="/results/:cipCode/:zip"
                element={<V3ResultsPage />}
              />
              <Route path="/map/:socCode" element={<MapPage />} />

              <Route path="/v4" element={<V4HomePage />} />
              <Route path="/v4/map/:cipCode" element={<V4AtlasPage />} />
              <Route
                path="/v4/results/:cipCode/:zip"
                element={<V4ResultsPage />}
              />
              <Route
                path="/v4/results/:cipCode"
                element={<V4AtlasRedirect />}
              />
              <Route
                path="/v4/company/:cipCode/:companyName"
                element={<V4FootprintPage />}
              />
              <Route
                path="/v4/compare/:cipCode/:zipA/:zipB"
                element={<V4ComparePage />}
              />
              <Route path="/v4/pathways/:cipCode" element={<V4PathwaysPage />} />
              <Route path="/v4/badges/:cipCode" element={<V4BadgesPage />} />
              <Route path="/v4/versus/:cipA/:cipB" element={<V4VersusPage />} />
              <Route
                path="/v4/industries/:cipCode"
                element={<V4IndustriesPage />}
              />

              {/* /v2 is the current product with a free signup gate before results */}
              <Route path="/v2" element={<HomePage />} />
              <Route path="/v2/receipts" element={<V3ReceiptsPage />} />
              <Route
                path="/v2/results/:cipCode"
                element={
                  <V2SignupGate>
                    <ResultsPage />
                  </V2SignupGate>
                }
              />
              <Route
                path="/v2/results/:cipCode/place"
                element={
                  <V2SignupGate>
                    <V3ZipPromptPage />
                  </V2SignupGate>
                }
              />
              <Route
                path="/v2/results/:cipCode/:zip"
                element={
                  <V2SignupGate>
                    <V3ResultsPage />
                  </V2SignupGate>
                }
              />
              <Route path="/v2/map/:socCode" element={<MapPage />} />

              {/* /v3 is the current product with a signup modal over blurred results */}
              <Route path="/v3" element={<HomePage />} />
              <Route path="/v3/receipts" element={<V3ReceiptsPage />} />
              <Route path="/v3/roles" element={<RolePickerPage />} />
              <Route path="/v3/roles/report" element={<V3SignupGate><RoleReportPage /></V3SignupGate>} />
              <Route
                path="/v3/results/:cipCode"
                element={
                  <V3SignupGate>
                    <ResultsPage />
                  </V3SignupGate>
                }
              />
              <Route
                path="/v3/results/:cipCode/place"
                element={
                  <V3SignupGate>
                    <V3ZipPromptPage />
                  </V3SignupGate>
                }
              />
              <Route
                path="/v3/results/:cipCode/:zip"
                element={
                  <V3SignupGate>
                    <V3ResultsPage />
                  </V3SignupGate>
                }
              />
              <Route path="/v3/map/:socCode" element={<MapPage />} />
            </Routes>
          </Layout>
        </ThemeProvider>
      </BrowserRouter>
    </DataProvider>
  )
}
