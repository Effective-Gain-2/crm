import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function PrivateRoute({ children }) {
  const { userData, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    )
  }

  if (!userData) {
    return <Navigate to="/" replace />
  }

  return children
}