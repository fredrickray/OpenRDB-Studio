import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RequireSession } from '@/components/RequireSession'
import { LandingPage } from '@/pages/LandingPage'
import { SignInPage } from '@/pages/SignInPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { ProjectFormPage } from '@/pages/ProjectFormPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route element={<RequireSession />}>
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<ProjectFormPage />} />
          <Route path="/projects/:id/edit" element={<ProjectFormPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
