import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import QRCode from 'react-qr-code';
import { ShoppingBag, Plus, Trash2, ShieldCheck, Lock, LogOut, QrCode, Clock, CreditCard } from 'lucide-react';

// Valex Farms L.M.T. Live Paystack Key
const PAYSTACK_PUBLIC_KEY = "pk_live_ffda503b3feef1a91edee85646debb5ab4a6c2b0";

export default function ValexFarmsStore() {
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Admin Auth States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Admin QR Code Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const qrRef = useRef(null);
  const liveStoreUrl = window.location.href;

  // Checkout Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Product Form State
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Poultry',
    price: '',
    status: 'In Stock',
    estimatedReady: '',
    image_url: ''
  });

  // Real-time Firestore & Auth listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
      setLoading(false);
    }, (error) => {
      console.error("Firestore read error:", error);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSnapshot();
    };
  }, []);

  // Admin Auth Login/Logout
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setShowAuthModal(false);
      setEmail('');
      setPassword('');
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => signOut(auth);

  // Add Product with Pre-Order Support
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return;

    try {
      await addDoc(collection(db, 'products'), {
        name: newItem.name,
        category: newItem.category,
        price: parseFloat(newItem.price),
        status: newItem.status,
        estimatedReady: newItem.status === 'Pre-Order' ? newItem.estimatedReady : null,
        image_url: newItem.image_url || null,
        createdAt: serverTimestamp()
      });
      setNewItem({ name: '', category: 'Poultry', price: '', status: 'In Stock', estimatedReady: '', image_url: '' });
    } catch (err) {
      alert("Error adding item: " + err.message);
    }
  };

  // Delete Product
  const handleDeleteItem = async (id) => {
    if (!window.confirm('Delete this livestock listing?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err) {
      alert("Error deleting item: " + err.message);
    }
  };

  // Paystack Integration
  const handlePaystackPayment = (e) => {
    e.preventDefault();
    if (!customerEmail || !selectedItem) return;

    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: customerEmail,
      amount: selectedItem.price * 100, // Amount in Kobo
      currency: 'NGN',
      ref: 'VALEX_' + Math.floor((Math.random() * 1000000000) + 1),
      metadata: {
        custom_fields: [
          { display_name: "Item Name", variable_name: "item_name", value: selectedItem.name },
          { display_name: "Order Type", variable_name: "order_type", value: selectedItem.status },
          { display_name: "Customer Phone", variable_name: "customer_phone", value: customerPhone }
        ]
      },
      callback: function(response) {
        alert('Payment successful! Reference: ' + response.reference);
        setSelectedItem(null);
        setCustomerEmail('');
        setCustomerPhone('');
      },
      onClose: function() {
        alert('Transaction cancelled.');
      }
    });

    handler.openIframe();
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans">
      {/* Header */}
      <nav className="flex justify-between items-center px-8 py-5 bg-stone-900 text-white shadow-md">
        <div>
          <h1 className="text-xl font-bold tracking-wide text-emerald-400">VALEX FARMS L.T.D.</h1>
          <p className="text-xs text-stone-400">Scan & Access Livestock Storefront</p>
        </div>
        
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button 
                onClick={() => setShowQrModal(true)}
                className="flex items-center gap-2 text-xs font-medium bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 px-3 py-1.5 rounded-lg hover:bg-emerald-800/50 transition"
              >
                <QrCode className="w-4 h-4" /> Farm QR Code
              </button>
              <span className="text-xs bg-emerald-950 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Admin Active
              </span>
              <button onClick={handleLogout} className="p-2 text-stone-400 hover:text-white" title="Logout">
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button 
              onClick={() => setShowAuthModal(true)} 
              className="flex items-center gap-2 text-xs font-medium bg-stone-800 hover:bg-stone-700 px-4 py-2 rounded-lg border border-stone-700 transition"
            >
              <Lock className="w-4 h-4 text-emerald-400" /> Admin Portal
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-8">
        {/* Admin Inventory Management */}
        {user && (
          <div className="mb-10 p-6 bg-white border border-emerald-200 rounded-xl shadow-sm">
            <h2 className="text-lg font-bold mb-4 text-stone-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" /> Add Livestock / Pre-Order Item
            </h2>
            <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input 
                type="text" 
                placeholder="Item Name (e.g., Rams / Broilers)" 
                value={newItem.name} 
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="p-2 border rounded-lg text-sm bg-stone-50"
                required
              />
              <select 
                value={newItem.category} 
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                className="p-2 border rounded-lg text-sm bg-stone-50"
              >
                <option>Poultry</option>
                <option>Cattle</option>
                <option>Goats & Sheep</option>
                <option>Feed & Supplies</option>
              </select>
              <input 
                type="number" 
                placeholder="Price (₦)" 
                value={newItem.price} 
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                className="p-2 border rounded-lg text-sm bg-stone-50"
                required
              />
              <select 
                value={newItem.status} 
                onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
                className="p-2 border rounded-lg text-sm bg-stone-50"
              >
                <option value="In Stock">In Stock</option>
                <option value="Pre-Order">Pre-Order</option>
              </select>
              
              {newItem.status === 'Pre-Order' && (
                <input 
                  type="text" 
                  placeholder="Est. Ready Date (e.g., Ready Dec 15)" 
                  value={newItem.estimatedReady} 
                  onChange={(e) => setNewItem({ ...newItem, estimatedReady: e.target.value })}
                  className="p-2 border border-amber-300 rounded-lg text-sm bg-amber-50"
                  required
                />
              )}

              <input 
                type="text" 
                placeholder="Image URL (optional)" 
                value={newItem.image_url} 
                onChange={(e) => setNewItem({ ...newItem, image_url: e.target.value })}
                className="p-2 border rounded-lg text-sm bg-stone-50"
              />
              
              <button type="submit" className="md:col-span-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition text-sm">
                Publish Listing
              </button>
            </form>
          </div>
        )}

        {/* Storefront Display */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-stone-900">Available Livestock & Reserves</h2>
          <p className="text-stone-500 text-sm">Reserve or purchase live stock directly from Valex Farms L.T.D.</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-stone-400">Loading inventory...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-stone-300 text-stone-500">
            No active listings available.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {products.map((item) => (
              <div key={item.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between">
                {item.image_url && (
                  <img src={item.image_url} alt={item.name} className="h-48 w-full object-cover" />
                )}
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold uppercase px-2 py-1 bg-stone-100 text-stone-600 rounded">
                      {item.category}
                    </span>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                      item.status === 'Pre-Order' 
                        ? 'bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {item.status === 'Pre-Order' && <Clock className="w-3 h-3" />}
                      {item.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-stone-800">{item.name}</h3>
                  {item.estimatedReady && (
                    <p className="text-xs text-amber-700 font-medium mt-1">Ready: {item.estimatedReady}</p>
                  )}

                  <p className="text-2xl font-extrabold text-stone-900 mt-3">₦{Number(item.price).toLocaleString()}</p>
                </div>

                <div className="p-5 pt-0 flex gap-2">
                  <button 
                    onClick={() => setSelectedItem(item)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 text-white transition ${
                      item.status === 'Pre-Order' 
                        ? 'bg-amber-600 hover:bg-amber-700' 
                        : 'bg-stone-900 hover:bg-stone-800'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" /> 
                    {item.status === 'Pre-Order' ? 'Pre-Order Now' : 'Buy Now'}
                  </button>
                  {user && (
                    <button 
                      onClick={() => handleDeleteItem(item.id)} 
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-100"
                      title="Delete Product"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Paystack Order Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md border border-stone-200">
            <h3 className="text-xl font-bold text-stone-900 mb-1">
              {selectedItem.status === 'Pre-Order' ? 'Pre-Order Livestock' : 'Complete Purchase'}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Item: <strong className="text-stone-800">{selectedItem.name}</strong> (₦{Number(selectedItem.price).toLocaleString()})
            </p>

            <form onSubmit={handlePaystackPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Your Email Address</label>
                <input 
                  type="email" 
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@email.com"
                  className="w-full p-2.5 border rounded-lg text-sm"
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="08012345678"
                  className="w-full p-2.5 border rounded-lg text-sm"
                  required 
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-100 text-sm font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
                >
                  Pay with Paystack
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal (Admin) */}
      {showQrModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center border border-stone-200">
            <h3 className="text-lg font-bold text-stone-900 mb-1">Farm Access QR Code</h3>
            <p className="text-xs text-stone-500 mb-6">Scan to view available livestock and pre-orders.</p>
            <div className="bg-stone-50 p-6 rounded-xl border flex justify-center mb-6" ref={qrRef}>
              <QRCode value={liveStoreUrl} size={180} />
            </div>
            <button 
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Admin Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md border border-stone-200">
            <h3 className="text-xl font-bold text-stone-900 mb-2">Admin Portal Login</h3>
            {authError && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">{authError}</div>}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" required />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAuthModal(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 text-sm font-medium rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg">Log In</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}