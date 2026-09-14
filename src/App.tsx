import { useState } from 'react'
import './App.css'

declare const __BUGDROP_CORE_REPOSITORY__: string
declare const __BUGDROP_TEST_REPOSITORY__: string

const bugdropRepositoryUrl = `https://github.com/${__BUGDROP_CORE_REPOSITORY__}`
const testRepositoryIssuesUrl = `https://github.com/${__BUGDROP_TEST_REPOSITORY__}/issues`

// BugDrop API type declaration
declare global {
  interface Window {
    BugDrop?: {
      open: () => void;
      close: () => void;
      hide: () => void;
      show: () => void;
      isOpen: () => boolean;
      isButtonVisible: () => boolean;
    };
  }
}

interface Todo {
  id: number
  text: string
  completed: boolean
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: 'Loves long walks in the park', completed: true },
    { id: 2, text: 'Good with children and other pets', completed: false },
    { id: 3, text: 'Prefers a home with a yard', completed: false },
  ])
  const [inputValue, setInputValue] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  const addTodo = () => {
    if (inputValue.trim()) {
      const newTodo: Todo = {
        id: Date.now(),
        text: inputValue,
        completed: false,
      }
      setTodos([...todos, newTodo])
      setInputValue('')
    }
  }

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id))
  }

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true
  })

  const stats = {
    total: todos.length,
    active: todos.filter(t => !t.completed).length,
    completed: todos.filter(t => t.completed).length,
  }

  return (
    <div className="app-container">
      {/* BugDrop Demo Banner */}
      <div className="demo-banner">
        <div className="demo-banner-content">
          <span className="demo-banner-icon">🐛</span>
          <span className="demo-banner-text">
            <strong>BugDrop</strong> — In-app feedback → GitHub Issues.
            Screenshots, annotations, the works. Free & open source.
          </span>
          <div className="demo-banner-links">
            <a href="https://bugdrop.dev" className="demo-banner-back">
              Back to BugDrop
            </a>
            <a href="#api-demo">
              API Demo ↓
            </a>
            <a href={bugdropRepositoryUrl} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <a href="https://github.com/apps/bugdrop/installations/new" target="_blank" rel="noopener noreferrer">
              Install Free
            </a>
          </div>
        </div>
      </div>

      {/* Decorative backgrounds */}
      <div className="paw-bg"></div>
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      {/* Navigation */}
      <nav className="nav">
        <a href="#" className="nav-logo">
          <span className="nav-logo-icon">🐕</span>
          WienerMatch
        </a>
        <div className="nav-links">
          <a href="#how-it-works" className="nav-link">How It Works</a>
          <a href="#features" className="nav-link">Features</a>
          <a href="#api-demo" className="nav-link">API Demo</a>
          <a href="#demo" className="nav-link">Find Your Doxie</a>
          <span
            className="nav-link nav-report-bug"
            onClick={() => window.BugDrop?.open()}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && window.BugDrop?.open()}
          >
            🐛 Report Bug
          </span>
          <a href="#" className="nav-cta">Get Started</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Find Your Perfact
          </h1>
          <svg className="curved-text" viewBox="0 0 500 180" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <path id="curve" d="M 20 70 Q 250 170 480 70" fill="transparent" />
            </defs>
            <text>
              <textPath href="#curve" startOffset="50%" textAnchor="middle" className="curved-text-path">
                Wiener Dog
              </textPath>
            </text>
          </svg>
          <p className="hero-subtitle">
            AI-powered matchmaking for you and your perfect <em>long boi</em>.
            Because every <em>hot dog</em> deserves the right bun.
          </p>
          <div className="hero-cta-group">
            <a href="#demo" className="btn btn-primary">
              🐕 Start Matching
            </a>
            <a href="#how-it-works" className="btn btn-secondary">
              Learn More →
            </a>
          </div>
          <div className="hero-image">
            <span className="hero-doxie">🐕</span>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value">12,847</span>
              <span className="hero-stat-label">Happy Matches</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">98%</span>
              <span className="hero-stat-label">Match Success</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">500+</span>
              <span className="hero-stat-label">Partner Breeders</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works" id="how-it-works">
        <div className="section-container">
          <div className="section-header">
            <span className="section-label">How It Works</span>
            <h2 className="section-title">Three steps to your new best friend</h2>
            <p className="section-subtitle">
              Our AI-powered platform makes finding your perfect dachshund simple and fun.
            </p>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-icon">📝</div>
              <h3>Take the Quiz</h3>
              <p>Answer questions about your lifestyle, living situation, and what you're looking for in a furry friend.</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon">🤖</div>
              <h3>AI Matching</h3>
              <p>Our algorithm analyzes 50+ factors to find dachshunds that perfectly match your personality and needs.</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon">💕</div>
              <h3>Meet Your Match</h3>
              <p>Connect with verified breeders and rescues to meet your matches and find your forever friend.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features" id="features">
        <div className="section-container">
          <div className="section-header">
            <span className="section-label">Features</span>
            <h2 className="section-title">Why WienerMatch?</h2>
            <p className="section-subtitle">
              We're not just another pet finder. We're matchmakers for the long haul.
            </p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🧠</div>
              <h3>Smart AI Matching</h3>
              <p>Our proprietary algorithm considers temperament, energy levels, and lifestyle compatability for perfect matches.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">✅</div>
              <h3>Verified Breeders</h3>
              <p>Every breeder in our network is thoroughly vetted for ethical practices and healthy puppies.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🏥</div>
              <h3>Health Guarantees</h3>
              <p>All our doxies come with comprehensive health screenings and genetic testing documentation.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>Lifetime Support</h3>
              <p>Get access to our community of dachshund experts and fellow owners for advice anytime.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🚗</div>
              <h3>Transport Help</h3>
              <p>We coordinate safe transport options to bring your new family member home, wherever you are.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">❤️</div>
              <h3>Rescue Partners</h3>
              <p>We work with dachshund rescues nationwide to help find homes for dogs in need of love.</p>
            </div>
          </div>
        </div>
      </section>

      {/* API Demo Section */}
      <section className="api-demo-section" id="api-demo">
        <div className="api-demo-container">
          <div className="section-header">
            <span className="section-label">JavaScript API</span>
            <h2 className="section-title">Control BugDrop Programmatically</h2>
            <p className="section-subtitle">
              Use the BugDrop API to integrate feedback into your own UI and workflows.
            </p>
          </div>
          <div className="api-methods-grid">
            <div className="api-method-card">
              <h3>open()</h3>
              <p>Opens the feedback modal programmatically.</p>
              <button
                className="api-demo-button"
                onClick={() => window.BugDrop?.open()}
              >
                Try it
              </button>
              <code className="api-code-snippet">BugDrop.open()</code>
            </div>
            <div className="api-method-card">
              <h3>close()</h3>
              <p>Closes the feedback modal if it's open.</p>
              <button
                className="api-demo-button"
                onClick={() => window.BugDrop?.close()}
              >
                Try it
              </button>
              <code className="api-code-snippet">BugDrop.close()</code>
            </div>
            <div className="api-method-card">
              <h3>hide()</h3>
              <p>Hides the floating bug button.</p>
              <button
                className="api-demo-button"
                onClick={() => window.BugDrop?.hide()}
              >
                Try it
              </button>
              <code className="api-code-snippet">BugDrop.hide()</code>
            </div>
            <div className="api-method-card">
              <h3>show()</h3>
              <p>Shows the floating button (clears dismissed state).</p>
              <button
                className="api-demo-button"
                onClick={() => window.BugDrop?.show()}
              >
                Try it
              </button>
              <code className="api-code-snippet">BugDrop.show()</code>
            </div>
            <div className="api-method-card">
              <h3>isOpen()</h3>
              <p>Returns true if the modal is currently open.</p>
              <button
                className="api-demo-button"
                onClick={() => alert(`isOpen(): ${window.BugDrop?.isOpen()}`)}
              >
                Try it
              </button>
              <code className="api-code-snippet">BugDrop.isOpen()</code>
            </div>
            <div className="api-method-card">
              <h3>isButtonVisible()</h3>
              <p>Returns true if the floating button is visible.</p>
              <button
                className="api-demo-button"
                onClick={() => alert(`isButtonVisible(): ${window.BugDrop?.isButtonVisible()}`)}
              >
                Try it
              </button>
              <code className="api-code-snippet">BugDrop.isButtonVisible()</code>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo / Preference Builder */}
      <section className="demo-section" id="demo">
        <div className="demo-container">
          <div className="demo-header">
            <span className="section-label">Try It Out</span>
            <h2 className="section-title">Build Your Doxie Wishlist</h2>
            <p className="section-subtitle">
              Add the traits you're looking for in your perfect wiener dog companion.
            </p>
          </div>

          <div className="quiz-card">
            <div className="quiz-header">
              <span className="quiz-header-icon">🐕</span>
              <div className="quiz-header-text">
                <h3>My Ideal Doxie</h3>
                <p>What are you looking for?</p>
              </div>
            </div>
            <div className="quiz-content">
              <div className="stats-bar">
                <div className="stat">
                  <span className="stat-value">{stats.total}</span>
                  <span className="stat-label">Traits</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{stats.active}</span>
                  <span className="stat-label">Must-Have</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{stats.completed}</span>
                  <span className="stat-label">Nice-to-Have</span>
                </div>
              </div>

              <div className="input-section">
                <input
                  type="text"
                  className="todo-input"
                  placeholder="Add a trait (e.g., 'Good with cats')"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                />
                <button className="add-button" onClick={addTodo}>
                  Add Trait
                </button>
              </div>

              <div className="filter-buttons">
                <button
                  className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  All
                </button>
                <button
                  className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
                  onClick={() => setFilter('active')}
                >
                  Must-Have
                </button>
                <button
                  className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
                  onClick={() => setFilter('completed')}
                >
                  Nice-to-Have
                </button>
              </div>

              <div className="todo-list">
                {filteredTodos.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-state-icon">🐾</span>
                    <p>Add traits to build your wishlist!</p>
                  </div>
                ) : (
                  filteredTodos.map(todo => (
                    <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                      <div className="todo-content">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => toggleTodo(todo.id)}
                          className="todo-checkbox"
                          title="Mark as nice-to-have"
                        />
                        <span className="todo-text">{todo.text}</span>
                      </div>
                      <button
                        className="delete-button"
                        onClick={() => deleteTodo(todo.id)}
                        aria-label="Remove trait"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials">
        <div className="section-container">
          <div className="section-header">
            <span className="section-label">Happy Tails</span>
            <h2 className="section-title">Stories from our community</h2>
          </div>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <span className="testimonial-quote">"</span>
              <p className="testimonial-text">
                WienerMatch found us Bruno, and he's absolutely perfect for our family.
                The AI really understood what we needed!
              </p>
              <div className="testimonial-author">
                <span className="testimonial-avatar">👩</span>
                <div className="testimonial-info">
                  <h4>Sarah M.</h4>
                  <p>Matched with Bruno 🐕</p>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <span className="testimonial-quote">"</span>
              <p className="testimonial-text">
                As a first-time dog owner, I was nervous. The team walked me through
                everything. Pretzel is now my best friend!
              </p>
              <div className="testimonial-author">
                <span className="testimonial-avatar">👨</span>
                <div className="testimonial-info">
                  <h4>Mike T.</h4>
                  <p>Matched with Pretzel 🌭</p>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <span className="testimonial-quote">"</span>
              <p className="testimonial-text">
                We adopted our senior doxie Oscar through their rescue program.
                He's brought so much joy to our lives!
              </p>
              <div className="testimonial-author">
                <span className="testimonial-avatar">👵</span>
                <div className="testimonial-info">
                  <h4>Linda K.</h4>
                  <p>Adopted Oscar 🧡</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <div className="cta-icon">🐕</div>
          <h2>Ready to meet your match?</h2>
          <p>Join thousands of happy families who found their perfect dachshund through WienerMatch.</p>
          <a href="#" className="btn btn-white">Start Your Journey 🐾</a>
        </div>
      </section>

      {/* BugDrop CTA Section */}
      <section className="bugdrop-cta-section">
        <div className="bugdrop-cta-content">
          <div className="bugdrop-cta-icon">🐛</div>
          <h2>Like this feedback widget?</h2>
          <p>Add BugDrop to your site in 2 minutes. Free, open source, and creates GitHub Issues automatically.</p>
          <div className="bugdrop-cta-buttons">
            <a href="https://github.com/apps/bugdrop/installations/new" target="_blank" rel="noopener noreferrer" className="btn btn-bugdrop-primary">
              Install Free →
            </a>
            <a href={bugdropRepositoryUrl} target="_blank" rel="noopener noreferrer" className="btn btn-bugdrop-secondary">
              View on GitHub
            </a>
          </div>
          <p className="bugdrop-cta-note">
            See the <a href={testRepositoryIssuesUrl} target="_blank" rel="noopener noreferrer">issues created by this demo</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-bugdrop">
            <span>🐛</span> Powered by{' '}
            <a href={bugdropRepositoryUrl} target="_blank" rel="noopener noreferrer">
              <strong>BugDrop</strong>
            </a>
            {' — free to install & self-host · '}
            <a href="https://github.com/apps/bugdrop/installations/new" target="_blank" rel="noopener noreferrer">
              Install
            </a>
          </div>
        </div>
      </footer>

      {/* BugDrop Explainer Callout */}
      <div className="feedback-button-spotlight" aria-hidden="true"></div>
      <div className="bugdrop-explainer">
        <div className="explainer-content">
          <span className="explainer-title">Try BugDrop</span>
          <span className="explainer-desc">In-app feedback → GitHub Issues</span>
          <span className="explainer-note">Use the feedback button below to send a test report</span>
          <div className="explainer-links">
            <span
              onClick={() => window.BugDrop?.show()}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && window.BugDrop?.show()}
              style={{ cursor: 'pointer' }}
            >
              🐛 Show Button
            </span>
            <a href="#api-demo">
              API Demo
            </a>
            <a href="https://github.com/apps/bugdrop/installations/new" target="_blank" rel="noopener noreferrer">
              Install
            </a>
          </div>
        </div>
        <span className="explainer-arrow">↘</span>
      </div>
    </div>
  )
}

export default App
