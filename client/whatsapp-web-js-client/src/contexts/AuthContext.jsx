import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [userData, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      // Verifica primeiro 'auth', depois 'user' para compatibilidade
      const stored = localStorage.getItem('auth') || localStorage.getItem('user')
      if (stored) {
        try {
          const userData = JSON.parse(stored)
          if (userData && (userData.id || userData.username)) {
            setUser(userData)
            // Migra dados de 'user' para 'auth' se necessário
            if (localStorage.getItem('user') && !localStorage.getItem('auth')) {
              localStorage.setItem('auth', stored)
            }
          }
        } catch (parseError) {
          console.error('Erro ao fazer parse dos dados do usuário:', parseError)
          // Limpa dados corrompidos
          localStorage.removeItem('auth')
          localStorage.removeItem('user')
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados de autenticação:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  function login(data) {
    setUser(data)
    // Salva em ambos os lugares para manter compatibilidade
    localStorage.setItem('auth', JSON.stringify(data))
    localStorage.setItem('user', JSON.stringify(data))
  }

  function logout() {
    setUser(null)
    localStorage.removeItem('auth')
    localStorage.removeItem('user') // Remove também para compatibilidade
  }
  return (
    <AuthContext.Provider value={{ userData, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}