import { HashRouter, Routes, Route } from 'react-router-dom'
import { ConnectionsPage } from '@/pages/ConnectionsPage'
import { QueryEditorPage } from '@/pages/QueryEditorPage'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ConnectionsPage />} />
        <Route path="/connections" element={<ConnectionsPage />} />
        <Route path="/query" element={<QueryEditorPage />} />
      </Routes>
    </HashRouter>
  )
}

export default App




