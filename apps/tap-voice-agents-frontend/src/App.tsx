import { useState, useEffect } from 'react';
import { AppPhase, ActiveAgent, CartItem as CartItemType } from './types';
import { PRODUCTS, Product } from './utils/products';
import { useStepEvents } from './hooks/useStepEvents';

// Components
import ProductGrid from './components/shopping/ProductGrid';
import CartPanel from './components/shopping/CartPanel';
import VoiceInterface from './components/voice/VoiceInterface';
import SequenceDiagram from './components/diagram/SequenceDiagram';
import DevToolsPanel from './components/devtools/DevToolsPanel';

function App() {
  const [phase, setPhase] = useState<AppPhase>('shopping');
  const [activeAgent, setActiveAgent] = useState<ActiveAgent>('pete');
  const [cartItems, setCartItems] = useState<CartItemType[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartLocked] = useState(false); // Not using setCartLocked for now - cart stays unlocked
  const [sequenceExpanded, setSequenceExpanded] = useState(false);
  const [devtoolsVisible, setDevtoolsVisible] = useState(false);
  const [highlightedProductId, setHighlightedProductId] = useState<number | null>(null);

  const { steps, activeStep } = useStepEvents({
    onCartUpdated: (data) => {
      console.log('[App] Cart updated from Pete:', data);
      setCartOpen(true); // Open cart panel when Pete adds items
      setCartItems(data.items.map((item: any) => ({
        productId: item.id,
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: PRODUCTS.find(p => p.name === item.name)?.image || '/placeholder.jpg'
      })));
    },
    onCheckoutInitiated: (data) => {
      console.log('[App] Checkout initiated via SSE - switching to Penny');
      // Store checkout ID first
      sessionStorage.setItem('tap-checkout-id', data.checkout_id);
      // Use the shared transition function
      transitionToPenny();
    },
    onPaymentAuthorized: () => {
      console.log('[App] Payment authorized - closing cart to show sequence diagram');
      setCartOpen(false);
    }
  });

  // Shared function to transition from Pete to Penny
  const transitionToPenny = () => {
    console.log('[App] Transitioning to Penny - opening cart panel');
    setActiveAgent('penny');
    setCartOpen(true); // Open cart so user can see their order
    //setCartLocked(true);
    setPhase('checkout');
    setSequenceExpanded(true);
    setDevtoolsVisible(true);
  };

  // Auto-expand sequence diagram when steps start arriving
  useEffect(() => {
    if (steps.length > 0 && !sequenceExpanded) {
      setSequenceExpanded(true);
      setDevtoolsVisible(true);
      setPhase('checkout');
      
      // Scroll to sequence diagram after a short delay
      setTimeout(() => {
        const diagramElement = document.querySelector('.sequence-diagram-container');
        if (diagramElement) {
          diagramElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  }, [steps.length, sequenceExpanded]);

  // Calculate cart total
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Listen for cart updates from voice interface
  useEffect(() => {
    const handleCartUpdate = (event: CustomEvent) => {
      const { cart } = event.detail;
      if (cart && cart.items) {
        // Convert backend cart items to frontend format
        const frontendItems = cart.items.map((item: any) => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: PRODUCTS.find(p => p.name === item.name)?.image || '/placeholder.jpg'
        }));
        setCartItems(frontendItems);
        setCartOpen(true);
      }
    };

    window.addEventListener('cart-updated', handleCartUpdate as EventListener);
    return () => window.removeEventListener('cart-updated', handleCartUpdate as EventListener);
  }, []);

  // Handle add to cart
  const handleAddToCart = (product: Product) => {
    const existingItem = cartItems.find((item) => item.productId === product.id);

    if (existingItem) {
      setCartItems(
        cartItems.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCartItems([
        ...cartItems,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image: product.image,
        },
      ]);
    }

    // Highlight product and open cart
    setHighlightedProductId(product.id);
    setCartOpen(true);
    setTimeout(() => setHighlightedProductId(null), 2000);
  };

  // Handle remove from cart
  const handleRemoveFromCart = (productId: number) => {
    setCartItems(cartItems.filter((item) => item.productId !== productId));
  };

  // Get or create session ID
  const getSessionId = () => {
    let sessionId = sessionStorage.getItem('tap-session-id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('tap-session-id', sessionId);
    }
    return sessionId;
  };

  // Handle checkout from cart panel button - creates backend checkout session first
  const handleCheckout = async () => {
    try {
      const sessionId = getSessionId();
      const response = await fetch('http://localhost:8090/api/checkout/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId: 'demo-user'
        })
      });

      if (!response.ok) {
        console.error('[Checkout] Failed to initiate');
        return;
      }

      const data = await response.json();
      console.log('[Checkout] Session created:', data.checkoutId);
      sessionStorage.setItem('tap-checkout-id', data.checkoutId);
      
      // Transition to Penny
      transitionToPenny();
    } catch (err) {
      console.error('[Checkout] Error:', err);
    }
  };

  // Handle checkout initiated from voice interface (checkoutId already saved by VoiceInterface)
  const handleCheckoutInitiated = (checkoutId: string) => {
    console.log('[App] Checkout initiated from voice:', checkoutId);
    transitionToPenny();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Main Content Area */}
      <div className="relative" style={{ paddingBottom: devtoolsVisible ? '30vh' : '0' }}>
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
          <h1 className="heading-lg">TAP Voice Agents - Premium Fashion</h1>
          <p className="text-sm text-slate-400 mt-1">
            OpenBotAuth + ElevenLabs + Visa TAP Demo
          </p>
        </header>

        {/* Shopping Phase - Hide completely during checkout */}
        {phase === 'shopping' && (
          <div className="transition-all duration-500">
            <ProductGrid
              products={PRODUCTS}
              onAddToCart={handleAddToCart}
              highlightedProductId={highlightedProductId}
            />
          </div>
        )}

        {/* Cart Panel - Show during shopping and checkout phases */}
        <CartPanel
          items={cartItems}
          total={cartTotal}
          isOpen={cartOpen || cartLocked}
          isLocked={cartLocked}
          isCheckoutPhase={activeAgent === 'penny'}
          onRemoveItem={handleRemoveFromCart}
          onCheckout={handleCheckout}
        />

        {/* Sequence Diagram - Always visible */}
        <div className="sequence-diagram-container px-6 py-4 bg-purple-900/20 mt-8">
          <h2 className="text-xl font-bold mb-4 text-purple-300">Live TAP Payment Flow</h2>
          <SequenceDiagram
            steps={steps}
            activeStep={activeStep}
            expanded={sequenceExpanded}
          />
        </div>

        {/* Voice Interface - Always visible */}
        <VoiceInterface 
          activeAgent={activeAgent} 
          onAgentSwitch={setActiveAgent}
          onCheckoutInitiated={handleCheckoutInitiated}
          onPaymentStarted={() => {
            // Payment execution started - scroll to diagram but keep cart open until authorized
            setPhase('checkout');
            setSequenceExpanded(true);
            setDevtoolsVisible(true);
            // Scroll to diagram
            setTimeout(() => {
              const diagramElement = document.querySelector('.sequence-diagram-container');
              if (diagramElement) {
                diagramElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 100);
          }}
        />
      </div>

      {/* DevTools Panel */}
      <DevToolsPanel
        visible={devtoolsVisible}
        httpHeaders={steps[activeStep]?.data?.headers || null}
        consumerObject={steps.find((s) => s.id === 'verify-tap-signatures')?.data?.consumer || null}
        paymentObject={steps.find((s) => s.id === 'verify-tap-signatures')?.data?.payment || null}
        requestData={{
          method: 'POST',
          url: 'http://localhost:8090/merchant/checkout',
          body: steps.find((s) => s.id === 'merchant-receive')?.data,
        }}
      />
    </div>
  );
}

export default App;

