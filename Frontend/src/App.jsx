import { useState, useCallback, useEffect } from 'react'
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import CartSidebar from './components/CartSidebar'
import Home from './pages/Home'
import CategoryPage from './pages/CategoryPage'
import ProductDetails from './pages/ProductDetails'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AdminDashboard from './pages/AdminDashboard'
import CheckoutModal from './components/CheckoutModal'

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-sdk')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-sdk';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

export default function App() {
  const { user } = useAuth()
  const [cart, setCart] = useState(() => {
    // Initial load from localStorage for the current user if they are logged in
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser)
        const savedCart = localStorage.getItem(`cart_${u._id}`)
        return savedCart ? JSON.parse(savedCart) : []
      } catch (e) {
        console.error("Error parsing stored user or cart", e)
        return []
      }
    }
    return []
  })
  const [cartOpen, setCartOpen] = useState(false)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [productToSelectSize, setProductToSelectSize] = useState(null)
  const [toast, setToast] = useState('')
  const navigate = useNavigate()

  // Load cart when user changes (e.g. login/logout)
  useEffect(() => {
    if (user?._id) {
      const savedCart = localStorage.getItem(`cart_${user._id}`)
      setCart(savedCart ? JSON.parse(savedCart) : [])
    } else {
      setCart([])
    }
  }, [user])

  // Save cart when it changes
  useEffect(() => {
    if (user?._id) {
      localStorage.setItem(`cart_${user._id}`, JSON.stringify(cart))
    }
  }, [cart, user])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const addToCart = useCallback((product) => {
    if (!user) {
      navigate('/login')
      return
    }

    if (!product.selectedSize && product.sizes && product.sizes.length > 0) {
      setProductToSelectSize(product)
      return
    }

    setCart(prev => {
      const exists = prev.find(i => i.id === product.id && i.selectedSize === product.selectedSize)
      if (exists) {
        return prev.map(i => (i.id === product.id && i.selectedSize === product.selectedSize) ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { ...product, qty: 1 }]
    })
    setProductToSelectSize(null)
    showToast(`${product.name} (${product.selectedSize}) added to cart!`)
  }, [user, navigate])

  const updateQty = useCallback((id, selectedSize, delta) => {
    setCart(prev =>
      prev.map(i => (i.id === id && i.selectedSize === selectedSize) ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
    )
  }, [])

  const removeItem = useCallback((id, selectedSize) => {
    setCart(prev => prev.filter(i => !(i.id === id && i.selectedSize === selectedSize)))
  }, [])

  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0)

  const handleCheckoutSubmit = async (addressData) => {
    if (cart.length === 0) return;

    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    const res = await loadRazorpayScript();
    if (!res) {
      showToast('Razorpay SDK failed to load. Are you online?');
      return;
    }

    try {
      // 1. Create order on the backend
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/payment/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: totalAmount }),
      });

      const data = await response.json();

      if (!data.success) {
        showToast('Server error. Could not create payment order.');
        return;
      }

      // 2. Initialize Razorpay payment
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Vare Collection",
        description: "Test Transaction",
        order_id: data.orderId,
        handler: function (response) {
          console.log('Payment Successful:', response, { address: addressData });
          setShowCheckoutModal(false);
          setCart([]);
          showToast('Payment successful! Order placed successfully.');
        },
        prefill: {
          name: user?.name || "Customer",
          email: user?.email || "customer@example.com",
          contact: "9999999999" // Test number
        },
        theme: {
          color: "#000000" // Use our theme's accent or dark color
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error('Payment initialization error:', error);
      showToast('Something went wrong during payment initialization.');
    }
  }

  return (
    <>
      <Navbar cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />

      <Routes>
        <Route path="/" element={<Home onAddToCart={addToCart} />} />
        <Route path="/shirts" element={<CategoryPage category="shirts" onAddToCart={addToCart} />} />
        <Route path="/tshirts" element={<CategoryPage category="tshirts" onAddToCart={addToCart} />} />
        <Route path="/jeans" element={<CategoryPage category="jeans" onAddToCart={addToCart} />} />
        <Route path="/product/:id" element={<ProductDetails onAddToCart={addToCart} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route 
          path="/admin" 
          element={user && user.isAdmin ? <AdminDashboard /> : <Navigate to="/login" />} 
        />
      </Routes>

      <Footer />

      <CartSidebar
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onUpdateQty={updateQty}
        onRemove={removeItem}
        onCheckout={() => {
          setCartOpen(false)
          setShowCheckoutModal(true)
        }}
      />

      <CheckoutModal 
        isOpen={showCheckoutModal} 
        onClose={() => setShowCheckoutModal(false)}
        onSubmit={handleCheckoutSubmit}
      />

      <div className={`fixed bottom-8 right-8 bg-accent text-white px-6 py-4 rounded-md text-sm font-medium shadow-xl transition-all duration-300 z-[300] ${toast ? 'translate-y-0 opacity-100' : 'translate-y-[120%] opacity-0'}`}>
        {toast}
      </div>

      {/* Size Selection Modal */}
      {productToSelectSize && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-[fadeInUp_0.3s_ease_forwards]">
            <h3 className="text-xl font-serif font-bold mb-2">Select Size</h3>
            <p className="text-text-muted text-sm mb-6">Please choose a size for {productToSelectSize.name}</p>
            
            <div className="flex flex-wrap gap-3 mb-8">
              {productToSelectSize.sizes.map(size => (
                <button
                  key={size}
                  onClick={() => addToCart({ ...productToSelectSize, selectedSize: size })}
                  className="w-12 h-12 rounded-lg border-2 border-border-main flex items-center justify-center font-bold hover:border-accent hover:text-accent transition-all active:scale-95"
                >
                  {size}
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => setProductToSelectSize(null)}
              className="w-full py-3 text-text-muted font-medium hover:text-text-main transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
