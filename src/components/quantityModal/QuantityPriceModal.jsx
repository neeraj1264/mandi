import React, { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import "./QuantityPriceModal.css"; // custom CSS file

export default function QuantityPriceModal({ product, onSave, onClose }) {
  const [qty, setQty] = useState("");
  const [qtyType, setQtyType] = useState("kg");
  const [price, setPrice] = useState("");
  const [selectedVarIdx, setSelectedVarIdx] = useState(0);

  const quantityTypes = ["kg", "pc", "bx", "lt"];

  useEffect(() => {
    if (!product) return;
      // read optional initial price passed from parent
      const initialPrice = "";
    if (product.varieties && product.varieties.length > 0) {
      setSelectedVarIdx(0);
      setPrice(initialPrice ?? product.varieties[0].price ?? "");
    } else {
      setSelectedVarIdx(0);
      setPrice(initialPrice ?? product.price ?? "");
    }
    setQty("");
    setQtyType("kg");
  }, [product]);

  if (!product) return null;

  const selectedVar =
    selectedVarIdx !== null ? product.varieties[selectedVarIdx] : null;

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
      quantityType: qtyType,
    };

    onSave(itemToAdd);
    onClose();
  };

  return (
    <div
      className="qp-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="qp-modal">
        {/* Header */}
        <div className="qp-header">
          <h2>{product.name} — Qty & Price</h2>
          <button className="qp-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Variety */}
        {product.varieties && product.varieties.length > 0 && (
          <div className="qp-group">
            <label>Select variety</label>
            <select
              value={selectedVarIdx}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setSelectedVarIdx(idx);
                setPrice(product.varieties[idx].price ?? "");
              }}
            >
              {product.varieties.map((v, i) => (
                <option key={i} value={i}>
                  {v.size} — ₹ {v.price}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quantity */}
        <div className="qp-group">
          <label>Quantity</label>
          <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            placeholder="Enter quantity"
            style={{ flex: 1 }}
          />
         <select
              value={qtyType}
              onChange={(e) => setQtyType(e.target.value)}
              style={{ flex: "0.6" }}
            >
              {quantityTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Price */}
        <div className="qp-group">
          <label>Price (₹)</label>
          <input
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Enter price"
          />
          <small>You can edit price per mandi rate.</small>
        </div>

        {/* Buttons */}
        <div className="qp-actions">
          <button className="btn cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn add" onClick={handleSave}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
