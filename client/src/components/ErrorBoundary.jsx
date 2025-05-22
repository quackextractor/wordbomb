"use client"

import React from "react"

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // You can log error info here
  }

  render() {
    if (this.state.hasError) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-950 to-purple-900 p-4">
            <div className="card p-8 max-w-md w-full">
              <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
              <p className="text-white/70 mb-6">We're sorry, but an error occurred while rendering the application.</p>
              <button
                  className="px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-purple-900 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl focus:ring-purple-500 w-full"
                  onClick={() => window.location.reload()}
              >
                Reload Application
              </button>
            </div>
          </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
