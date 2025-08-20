import React, { useEffect, useState } from "react";
import { FaTimesCircle, FaMinusCircle, FaPlusCircle } from "react-icons/fa";

export default function QuantityPriceModal({ product, onSave, onClose }) {
  const [qty, setQty] = useState(null);
  const [price, setPrice] = useState("");
  const [selectedVarIdx, setSelectedVarIdx] = useState(null);

  useEffect(() => {
    if (!product) return;
    if (product.varieties && product.varieties.length > 0) {
      setSelectedVarIdx(0);
      setPrice(product.varieties[0].price ?? "");
    } else {
      setSelectedVarIdx(null);
      setPrice(product.price ?? "");
    }
    setQty(null);
  }, [product]);

  if (!product) return null;

  const selectedVar = selectedVarIdx !== null ? product.varieties[selectedVarIdx] : null;

  const handleSave = () => {
    if (!qty || qty <= 0) {
      alert("Enter a valid quantity");
      return;
    }
    if (price === "" || Number(price) <= 0) {
      alert("Enter a valid price");
      return;
    }

    const itemToAdd = {
      ...product,
      size: selectedVar?.size ?? product.size,
      price: Number(price),
      quantity: Number(qty),
    };

    onSave(itemToAdd);
    onClose();
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={`${product.name} quantity & price`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{product.name} — Qty & Price</h2>
          <FaTimesCircle className="cursor-pointer" onClick={onClose} />
        </div>

        {product.varieties && product.varieties.length > 0 && (
          <div className="mb-3">
            <label className="block mb-1 font-medium">Select variety</label>
            <select
              value={selectedVarIdx}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setSelectedVarIdx(idx);
                setPrice(product.varieties[idx].price ?? "");
              }}
              className="w-full border p-2 rounded"
            >
              {product.varieties.map((v, i) => (
                <option key={i} value={i}>
                  {v.size} — ₹ {v.price}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-3">
          <label className="block mb-1 font-medium">Quantity</label>
          <div className="flex items-center gap-2">
            <input type="number" min="1" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-full border p-2 rounded" />
          </div>
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Price (₹)</label>
          <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full border p-2 rounded" />
          <small className="text-xs text-gray-500">You can edit price per mandi rate.</small>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 rounded bg-green-600 text-white">Add</button>
        </div>
      </div>
    </div>
  );
}
