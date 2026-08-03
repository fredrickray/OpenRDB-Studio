import { HashRouter, Routes, Route } from 'react-router-dom'
import { ConnectionsPage } from '@/pages/ConnectionsPage'
import { QueryEditorPage } from '@/pages/QueryEditorPage'
import { TableWorkspacePage } from '@/pages/TableWorkspacePage'
import { ErdViewPage } from '@/pages/ErdViewPage'
import { useMenuActions } from '@/hooks/useMenuActions'

function AppRoutes() {
  useMenuActions()

  return (
    <Routes>
      <Route path="/" element={<ConnectionsPage />} />
      <Route path="/connections" element={<ConnectionsPage />} />
      <Route path="/workspace" element={<TableWorkspacePage />} />
      <Route path="/query" element={<QueryEditorPage />} />
      <Route path="/erd" element={<ErdViewPage />} />
    </Routes>
  )
}

function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}

export default App





